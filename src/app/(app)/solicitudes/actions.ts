'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import type { z } from 'zod';
import { db, dbTx } from '@/db';
import { assets, locations, notifications, serviceRequestNotes, serviceRequests, sites, users, workTypes } from '@/db/schema';
import { requirePermission, hasPermission } from '@/lib/permissions';
import { auth } from '@/lib/auth';
import { getCurrentTenant } from '@/lib/tenant';
import { buildDiff, writeAudit } from '@/lib/audit';
import { nextCode } from '@/lib/sequences';
import { solicitudBaseSchema, type SolicitudFormValues } from '@/lib/validators/solicitud';
import { UnauthorizedError, ForbiddenError } from '@/lib/permissions/guard';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

const SLA_HORAS: Record<string, number> = { URGENTE: 4, ALTA: 24, MEDIA: 72, BAJA: 168 };

async function requireSesion() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session;
}

async function crearNotificacion(tenantId: string, userId: string, tipo: string, titulo: string, cuerpo: string, entidadId: string) {
  await db.insert(notifications).values({ tenantId, userId, tipo, titulo, cuerpo, link: `/solicitudes/${entidadId}`, entidad: 'solicitudes', entidadId });
}

function datosDeFormulario(data: z.infer<typeof solicitudBaseSchema>) {
  return {
    descripcion: data.descripcion,
    prioridad: data.prioridad,
    assetId: data.assetId ?? null,
    locationId: data.locationId ?? null,
    siteId: data.siteId ?? null,
    workTypeId: data.workTypeId ?? null,
  };
}

export async function crearSolicitud(input: SolicitudFormValues): Promise<AccionResultado> {
  const session = await requirePermission('solicitudes.crear');
  const parsed = solicitudBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();

  const [fila] = await db
    .insert(serviceRequests)
    .values({ tenantId: tenant.id, solicitanteUserId: session.user.id, ...datosDeFormulario(parsed.data) })
    .returning({ id: serviceRequests.id });

  const id = fila?.id;
  if (!id) return { ok: false, error: 'No se pudo crear la solicitud.' };

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'solicitudes',
    entidadId: id,
    accion: 'INSERT',
    permiso: 'solicitudes.crear',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: buildDiff(null, parsed.data),
  });

  revalidatePath('/solicitudes');
  revalidatePath('/mis-solicitudes');
  return { ok: true, id };
}

export async function actualizarSolicitud(id: string, input: SolicitudFormValues): Promise<AccionResultado> {
  const session = await requirePermission('solicitudes.editar');
  const parsed = solicitudBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  if (!sr) return { ok: false, error: 'La solicitud ya no existe.' };
  if (sr.estado !== 'BORRADOR') return { ok: false, error: 'Solo se puede editar mientras está en borrador.' };
  if (session.user.scope === 'PROPIO' && sr.solicitanteUserId !== session.user.id) {
    return { ok: false, error: 'No puedes editar la solicitud de otra persona.' };
  }

  await db.update(serviceRequests).set(datosDeFormulario(parsed.data)).where(eq(serviceRequests.id, id));

  revalidatePath(`/solicitudes/${id}`);
  revalidatePath('/solicitudes');
  return { ok: true, id };
}

export async function eliminarSolicitud(id: string): Promise<AccionResultado> {
  const session = await requirePermission('solicitudes.editar');
  const tenant = await getCurrentTenant();
  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  if (!sr) return { ok: false, error: 'La solicitud ya no existe.' };
  if (sr.estado !== 'BORRADOR') return { ok: false, error: 'Solo se puede eliminar mientras está en borrador.' };
  if (session.user.scope === 'PROPIO' && sr.solicitanteUserId !== session.user.id) {
    return { ok: false, error: 'No puedes eliminar la solicitud de otra persona.' };
  }

  await db.delete(serviceRequests).where(eq(serviceRequests.id, id));
  revalidatePath('/solicitudes');
  revalidatePath('/mis-solicitudes');
  return { ok: true };
}

/** BORRADOR → ENVIADA. Aquí, y solo aquí, se asigna el consecutivo (D-08). */
export async function enviarSolicitud(id: string): Promise<AccionResultado> {
  const session = await requirePermission('solicitudes.editar');
  const tenant = await getCurrentTenant();
  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  if (!sr) return { ok: false, error: 'La solicitud ya no existe.' };
  if (sr.estado !== 'BORRADOR') return { ok: false, error: 'Solo se puede enviar una solicitud en borrador.' };
  if (session.user.scope === 'PROPIO' && sr.solicitanteUserId !== session.user.id) {
    return { ok: false, error: 'No puedes enviar la solicitud de otra persona.' };
  }
  if (!sr.descripcion.trim()) return { ok: false, error: 'Describe el problema antes de enviar.' };

  await dbTx.transaction(async (tx) => {
    const consecutivo = await nextCode(tx, tenant.id, 'SS');
    await tx.update(serviceRequests).set({ estado: 'ENVIADA', consecutivo }).where(eq(serviceRequests.id, id));
  });

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'solicitudes',
    entidadId: id,
    accion: 'UPDATE',
    permiso: 'solicitudes.editar',
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { estado: { antes: 'BORRADOR', despues: 'ENVIADA' } },
  });

  revalidatePath(`/solicitudes/${id}`);
  revalidatePath('/solicitudes');
  revalidatePath('/mis-solicitudes');
  return { ok: true, id };
}

async function cambiarEstado(
  id: string,
  permiso: Parameters<typeof requirePermission>[0],
  estadosValidos: string[],
  cambios: Record<string, unknown>,
  notificar?: { userId: string; tipo: string; titulo: string; cuerpo: string },
): Promise<AccionResultado> {
  const session = await requirePermission(permiso);
  const tenant = await getCurrentTenant();

  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  if (!sr) return { ok: false, error: 'La solicitud ya no existe.' };
  if (!estadosValidos.includes(sr.estado)) {
    return { ok: false, error: `No se puede hacer esta acción desde el estado "${sr.estado}".` };
  }

  await db.update(serviceRequests).set(cambios).where(eq(serviceRequests.id, id));

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'solicitudes',
    entidadId: id,
    accion: 'UPDATE',
    permiso,
    userId: session.user.id,
    userEmail: session.user.email ?? null,
    diff: { estado: { antes: sr.estado, despues: cambios.estado ?? sr.estado } },
  });

  if (notificar) {
    await crearNotificacion(tenant.id, notificar.userId, notificar.tipo, notificar.titulo, notificar.cuerpo, id);
  }

  revalidatePath(`/solicitudes/${id}`);
  revalidatePath('/solicitudes');
  revalidatePath('/mis-solicitudes');
  return { ok: true, id };
}

export async function aprobarSolicitud(id: string): Promise<AccionResultado> {
  const tenant = await getCurrentTenant();
  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  const horas = sr ? (SLA_HORAS[sr.prioridad] ?? 72) : 72;
  const fechaCompromiso = new Date(Date.now() + horas * 3600_000);

  const resultado = await cambiarEstado(id, 'solicitudes.aprobar', ['ENVIADA', 'EN_REVISION'], { estado: 'APROBADA', fechaCompromiso }, sr ? { userId: sr.solicitanteUserId, tipo: 'solicitud_aprobada', titulo: 'Tu solicitud fue aprobada', cuerpo: sr.consecutivo ?? '' } : undefined);
  return resultado;
}

export async function rechazarSolicitud(id: string, causa: string): Promise<AccionResultado> {
  if (!causa.trim()) return { ok: false, error: 'Indica el motivo del rechazo.' };
  const tenant = await getCurrentTenant();
  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);

  return cambiarEstado(
    id,
    'solicitudes.rechazar',
    ['ENVIADA', 'EN_REVISION'],
    { estado: 'RECHAZADA', causaRechazo: causa },
    sr ? { userId: sr.solicitanteUserId, tipo: 'solicitud_rechazada', titulo: 'Tu solicitud fue rechazada', cuerpo: causa } : undefined,
  );
}

export async function asignarSolicitud(id: string, responsableUserId: string): Promise<AccionResultado> {
  const resultado = await cambiarEstado(id, 'solicitudes.asignar', ['APROBADA'], { estado: 'ASIGNADA', responsableUserId }, {
    userId: responsableUserId,
    tipo: 'solicitud_asignada',
    titulo: 'Te asignaron una solicitud',
    cuerpo: '',
  });
  return resultado;
}

export async function iniciarAtencionSolicitud(id: string): Promise<AccionResultado> {
  return cambiarEstado(id, 'solicitudes.atender', ['ASIGNADA'], { estado: 'EN_ATENCION', fechaAtencion: new Date() });
}

export async function resolverSolicitud(id: string, solucion: string, esAtencionDirecta: boolean): Promise<AccionResultado> {
  if (!solucion.trim()) return { ok: false, error: 'Describe la solución aplicada.' };
  if (esAtencionDirecta) {
    await requirePermission('solicitudes.atencion_directa');
  }
  const tenant = await getCurrentTenant();
  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);

  return cambiarEstado(
    id,
    'solicitudes.atender',
    ['EN_ATENCION'],
    { estado: 'RESUELTA', solucionAplicada: solucion, esAtencionDirecta },
    sr ? { userId: sr.solicitanteUserId, tipo: 'solicitud_resuelta', titulo: 'Tu solicitud fue resuelta', cuerpo: '¿Puedes calificar el servicio recibido?' } : undefined,
  );
}

export async function cerrarSolicitud(id: string): Promise<AccionResultado> {
  return cambiarEstado(id, 'solicitudes.cerrar', ['RESUELTA'], { estado: 'CERRADA' });
}

export async function calificarSolicitud(id: string, calificacion: number, comentario: string): Promise<AccionResultado> {
  const session = await requirePermission('solicitudes.calificar');
  if (calificacion < 1 || calificacion > 5) return { ok: false, error: 'La calificación debe ser de 1 a 5.' };

  const tenant = await getCurrentTenant();
  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  if (!sr) return { ok: false, error: 'La solicitud ya no existe.' };
  if (sr.solicitanteUserId !== session.user.id) return { ok: false, error: 'Solo quien reportó la solicitud puede calificarla.' };
  if (!['RESUELTA', 'CERRADA'].includes(sr.estado)) return { ok: false, error: 'Todavía no se puede calificar: no está resuelta.' };

  await db.update(serviceRequests).set({ calificacion, comentarioCalificacion: comentario || null }).where(eq(serviceRequests.id, id));

  revalidatePath(`/solicitudes/${id}`);
  revalidatePath('/mis-solicitudes');
  return { ok: true, id };
}

export async function agregarNota(id: string, mensaje: string, visibleSolicitante: boolean): Promise<AccionResultado> {
  const session = await requireSesion();
  if (!hasPermission(session, 'solicitudes.ver')) throw new ForbiddenError('solicitudes.ver');
  if (!mensaje.trim()) return { ok: false, error: 'Escribe un mensaje.' };

  const tenant = await getCurrentTenant();
  const [sr] = await db.select().from(serviceRequests).where(and(eq(serviceRequests.id, id), eq(serviceRequests.tenantId, tenant.id))).limit(1);
  if (!sr) return { ok: false, error: 'La solicitud ya no existe.' };

  const esParte = sr.solicitanteUserId === session.user.id || sr.responsableUserId === session.user.id;
  if (!esParte && !hasPermission(session, 'solicitudes.editar')) {
    return { ok: false, error: 'No tienes permiso para comentar en esta solicitud.' };
  }

  await db.insert(serviceRequestNotes).values({ serviceRequestId: id, mensaje, visibleSolicitante, createdBy: session.user.id });

  const notificarA = session.user.id === sr.solicitanteUserId ? sr.responsableUserId : sr.solicitanteUserId;
  if (notificarA && visibleSolicitante) {
    await crearNotificacion(tenant.id, notificarA, 'solicitud_nota', 'Nuevo comentario en tu solicitud', mensaje.slice(0, 140), id);
  }

  revalidatePath(`/solicitudes/${id}`);
  return { ok: true };
}

export async function obtenerNotas(id: string, soloVisiblesSolicitante: boolean) {
  await requirePermission('solicitudes.ver');
  const notas = await db
    .select({ id: serviceRequestNotes.id, mensaje: serviceRequestNotes.mensaje, visibleSolicitante: serviceRequestNotes.visibleSolicitante, createdAt: serviceRequestNotes.createdAt, autorNombre: users.nombre })
    .from(serviceRequestNotes)
    .leftJoin(users, eq(users.id, serviceRequestNotes.createdBy))
    .where(eq(serviceRequestNotes.serviceRequestId, id))
    .orderBy(serviceRequestNotes.createdAt);

  return soloVisiblesSolicitante ? notas.filter((n) => n.visibleSolicitante) : notas;
}

export type OpcionesSolicitud = {
  assets: { value: string; label: string }[];
  locations: { value: string; label: string }[];
  sites: { value: string; label: string }[];
  workTypes: { value: string; label: string }[];
  responsables: { value: string; label: string }[];
};

export async function obtenerOpcionesSolicitud(): Promise<OpcionesSolicitud> {
  await requirePermission('solicitudes.crear');
  const tenant = await getCurrentTenant();

  const [ast, locs, sts, wts] = await Promise.all([
    db.select({ value: assets.id, label: assets.nombre }).from(assets).where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).orderBy(assets.nombre),
    db.select({ value: locations.id, label: locations.nombre }).from(locations).where(and(eq(locations.tenantId, tenant.id), eq(locations.activo, true), isNull(locations.deletedAt))).orderBy(locations.nombre),
    db.select({ value: sites.id, label: sites.nombre }).from(sites).where(and(eq(sites.tenantId, tenant.id), eq(sites.activo, true), isNull(sites.deletedAt))).orderBy(sites.nombre),
    db.select({ value: workTypes.id, label: workTypes.nombre }).from(workTypes).where(and(eq(workTypes.tenantId, tenant.id), eq(workTypes.activo, true), isNull(workTypes.deletedAt))).orderBy(workTypes.nombre),
  ]);

  return { assets: ast, locations: locs, sites: sts, workTypes: wts, responsables: [] };
}

export async function obtenerResponsablesDisponibles(): Promise<{ value: string; label: string }[]> {
  await requirePermission('solicitudes.asignar');
  const tenant = await getCurrentTenant();
  return db.select({ value: users.id, label: users.nombre }).from(users).where(and(eq(users.tenantId, tenant.id), eq(users.activo, true), isNull(users.deletedAt))).orderBy(users.nombre);
}
