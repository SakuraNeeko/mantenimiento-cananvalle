'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { adverseEvents, assets } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { buildDiff, writeAudit } from '@/lib/audit';
import { z } from 'zod';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

const eventoSchema = z.object({
  assetId: z.string().trim().min(1, 'Selecciona el activo.'),
  tipo: z.enum(['EVENTO_ADVERSO', 'INCIDENTE', 'ALERTA_FABRICANTE']),
  severidad: z.enum(['LEVE', 'MODERADA', 'GRAVE', 'CRITICA']).optional(),
  clasificacion: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  fecha: z.string().trim().min(1, 'Indica la fecha.'),
  descripcion: z.string().trim().min(5, 'Describe el evento con más detalle.'),
});

export type EventoFormValues = z.infer<typeof eventoSchema>;

export async function registrarEvento(input: EventoFormValues): Promise<AccionResultado> {
  const session = await requirePermission('tecnovigilancia.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'tecnovigilancia');

  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const [asset] = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, parsed.data.assetId), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).limit(1);
  if (!asset) return { ok: false, error: 'El activo seleccionado ya no existe.' };

  const [fila] = await db
    .insert(adverseEvents)
    .values({
      tenantId: tenant.id,
      assetId: parsed.data.assetId,
      tipo: parsed.data.tipo,
      severidad: parsed.data.severidad ?? null,
      clasificacion: parsed.data.clasificacion ?? null,
      fecha: new Date(parsed.data.fecha),
      descripcion: parsed.data.descripcion,
      reportanteUserId: session.user.id,
    })
    .returning({ id: adverseEvents.id });

  const id = fila?.id;
  if (!id) return { ok: false, error: 'No se pudo registrar el evento.' };

  await writeAudit({ tenantId: tenant.id, entidad: 'tecnovigilancia', entidadId: id, accion: 'INSERT', nivel: 'CRITICO', permiso: 'tecnovigilancia.registrar', userId: session.user.id, diff: buildDiff(null, parsed.data) });
  revalidatePath('/tecnovigilancia');
  return { ok: true, id };
}

export async function actualizarEvento(id: string, input: EventoFormValues): Promise<AccionResultado> {
  const session = await requirePermission('tecnovigilancia.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'tecnovigilancia');

  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const [evento] = await db.select().from(adverseEvents).where(and(eq(adverseEvents.id, id), eq(adverseEvents.tenantId, tenant.id))).limit(1);
  if (!evento) return { ok: false, error: 'El evento ya no existe.' };
  if (evento.estado === 'CERRADO') return { ok: false, error: 'Este evento ya está cerrado.' };

  await db
    .update(adverseEvents)
    .set({ assetId: parsed.data.assetId, tipo: parsed.data.tipo, severidad: parsed.data.severidad ?? null, clasificacion: parsed.data.clasificacion ?? null, fecha: new Date(parsed.data.fecha), descripcion: parsed.data.descripcion })
    .where(eq(adverseEvents.id, id));

  await writeAudit({ tenantId: tenant.id, entidad: 'tecnovigilancia', entidadId: id, accion: 'UPDATE', permiso: 'tecnovigilancia.registrar', userId: session.user.id, diff: buildDiff(evento as unknown as Record<string, unknown>, parsed.data) });
  revalidatePath(`/tecnovigilancia/${id}`);
  revalidatePath('/tecnovigilancia');
  return { ok: true, id };
}

export async function iniciarGestionEvento(id: string): Promise<AccionResultado> {
  const session = await requirePermission('tecnovigilancia.registrar');
  const tenant = await getCurrentTenant();
  const [evento] = await db.select({ estado: adverseEvents.estado }).from(adverseEvents).where(and(eq(adverseEvents.id, id), eq(adverseEvents.tenantId, tenant.id))).limit(1);
  if (!evento) return { ok: false, error: 'El evento ya no existe.' };
  if (evento.estado !== 'ABIERTO') return { ok: false, error: 'Solo se puede iniciar gestión de un evento abierto.' };

  await db.update(adverseEvents).set({ estado: 'EN_GESTION' }).where(eq(adverseEvents.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'tecnovigilancia', entidadId: id, accion: 'UPDATE', permiso: 'tecnovigilancia.registrar', userId: session.user.id, diff: { estado: { antes: 'ABIERTO', despues: 'EN_GESTION' } } });
  revalidatePath(`/tecnovigilancia/${id}`);
  revalidatePath('/tecnovigilancia');
  return { ok: true, id };
}

export async function cerrarEvento(id: string, causaRaiz: string, accionesCorrectivas: string): Promise<AccionResultado> {
  const session = await requirePermission('tecnovigilancia.registrar');
  if (!causaRaiz.trim() || !accionesCorrectivas.trim()) return { ok: false, error: 'Indica la causa raíz y las acciones correctivas antes de cerrar.' };

  const tenant = await getCurrentTenant();
  const [evento] = await db.select({ estado: adverseEvents.estado }).from(adverseEvents).where(and(eq(adverseEvents.id, id), eq(adverseEvents.tenantId, tenant.id))).limit(1);
  if (!evento) return { ok: false, error: 'El evento ya no existe.' };
  if (evento.estado === 'CERRADO') return { ok: false, error: 'Este evento ya está cerrado.' };

  await db.update(adverseEvents).set({ estado: 'CERRADO', causaRaiz, accionesCorrectivas, cerradaAt: new Date(), cerradaBy: session.user.id }).where(eq(adverseEvents.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'tecnovigilancia', entidadId: id, accion: 'UPDATE', nivel: 'CRITICO', permiso: 'tecnovigilancia.registrar', userId: session.user.id, diff: { estado: { antes: evento.estado, despues: 'CERRADO' } } });
  revalidatePath(`/tecnovigilancia/${id}`);
  revalidatePath('/tecnovigilancia');
  return { ok: true, id };
}

export async function marcarReportadoAutoridad(id: string, numeroReporte: string): Promise<AccionResultado> {
  const session = await requirePermission('tecnovigilancia.reportar');
  const tenant = await getCurrentTenant();
  const [evento] = await db.select({ id: adverseEvents.id }).from(adverseEvents).where(and(eq(adverseEvents.id, id), eq(adverseEvents.tenantId, tenant.id))).limit(1);
  if (!evento) return { ok: false, error: 'El evento ya no existe.' };

  await db.update(adverseEvents).set({ reportadoAutoridad: true, fechaReporte: new Date(), numeroReporte: numeroReporte || null }).where(eq(adverseEvents.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'tecnovigilancia', entidadId: id, accion: 'UPDATE', nivel: 'CRITICO', permiso: 'tecnovigilancia.reportar', userId: session.user.id, diff: { reportado_autoridad: { antes: false, despues: true } } });
  revalidatePath(`/tecnovigilancia/${id}`);
  revalidatePath('/tecnovigilancia');
  return { ok: true, id };
}

export async function obtenerOpcionesEvento() {
  await requirePermission('tecnovigilancia.registrar');
  const tenant = await getCurrentTenant();
  return db.select({ value: assets.id, label: assets.nombre, codigo: assets.codigo }).from(assets).where(and(eq(assets.tenantId, tenant.id), eq(assets.clase, 'BIOMEDICO'), isNull(assets.deletedAt))).orderBy(assets.nombre);
}
