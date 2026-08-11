'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import type { Session } from 'next-auth';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, dbTx } from '@/db';
import { assetMeters, assetUsageLogs, assets, locations, meterReadings, meters, responsibles, sites, uoms } from '@/db/schema';
import { requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { buildDiff, writeAudit } from '@/lib/audit';
import type { TipoLecturaMedidor } from '@/lib/combustibles/medidor';
import { DESTINO_OTRO, regresoBaseSchema, salidaBaseSchema, type RegresoFormValues, type SalidaFormValues } from '@/lib/validators/bitacora';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

/**
 * Ocultar el activo en el selector no basta (§8 del prompt maestro): un
 * rol de alcance SEDE (ej. Guardia) no puede registrar uso de un activo de
 * otra finca aunque adivine el id. Sin finca asignada = visible siempre
 * (decisión del negocio: activos aún sin clasificar no deben bloquear a
 * nadie). TENANT y PROPIO no se restringen aquí — PROPIO (Técnico) no tiene
 * el concepto de "activos propios".
 */
async function assertAccesoActivo(session: Session, assetId: string): Promise<string | null> {
  const { scope, siteIds } = scopeDescriptor(session);
  if (scope !== 'SEDE') return null;

  const [fila] = await db
    .select({ siteId: locations.siteId })
    .from(assets)
    .leftJoin(locations, eq(locations.id, assets.locationId))
    .where(eq(assets.id, assetId))
    .limit(1);

  if (!fila?.siteId) return null;
  if (!siteIds.includes(fila.siteId)) return 'No tienes acceso a este activo desde tu sede.';
  return null;
}

const TIPOS_FOTO_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp']);
const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;

/** La foto es opcional en ambos extremos del uso: si no viene, sigue sin foto. */
async function subirFoto(prefix: string, formData: FormData): Promise<{ ok: true; url: string | null } | { ok: false; error: string }> {
  const file = formData.get('foto');
  if (!(file instanceof File) || file.size === 0) return { ok: true, url: null };
  if (!TIPOS_FOTO_PERMITIDOS.has(file.type)) return { ok: false, error: 'La foto debe ser PNG, JPEG o WEBP.' };
  if (file.size > TAMANO_MAXIMO_BYTES) return { ok: false, error: 'La foto supera los 10 MB.' };

  try {
    const nombreSaneado = file.name.replace(/[^\w.\-]+/g, '_');
    const blob = await put(`${prefix}/${Date.now()}-${nombreSaneado}`, file, { access: 'public' });
    return { ok: true, url: blob.url };
  } catch (error) {
    console.error('[bitacora] subirFoto', error);
    return { ok: false, error: 'No se pudo subir la foto. Verifica que BLOB_READ_WRITE_TOKEN esté configurado.' };
  }
}

/** Mismo criterio que Combustibles: una lectura alimenta el medidor real del activo, si tiene uno. */
async function obtenerMedidorRelevante(tenantId: string, assetId: string) {
  const [fila] = await db
    .select({ assetMeterId: assetMeters.id, valorActual: assetMeters.valorActual, permiteRetroceso: meters.permiteRetroceso })
    .from(assetMeters)
    .innerJoin(meters, eq(meters.id, assetMeters.meterId))
    .where(and(eq(assetMeters.assetId, assetId), eq(assetMeters.tenantId, tenantId), isNull(assetMeters.deletedAt), inArray(meters.tipoLectura, ['HOROMETRO', 'ODOMETRO'])))
    .limit(1);
  return fila ?? null;
}

async function validarSite(tenantId: string, siteId: string): Promise<boolean> {
  const [fila] = await db.select({ id: sites.id }).from(sites).where(and(eq(sites.id, siteId), eq(sites.tenantId, tenantId), isNull(sites.deletedAt))).limit(1);
  return Boolean(fila);
}

export async function registrarSalida(input: SalidaFormValues, formData: FormData): Promise<AccionResultado> {
  const session = await requirePermission('bitacora.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'bitacora');

  const parsed = salidaBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const [asset] = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, parsed.data.assetId), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).limit(1);
  if (!asset) return { ok: false, error: 'El activo seleccionado ya no existe.' };

  const [responsable] = await db
    .select({ id: responsibles.id })
    .from(responsibles)
    .where(and(eq(responsibles.id, parsed.data.responsableId), eq(responsibles.tenantId, tenant.id), isNull(responsibles.deletedAt)))
    .limit(1);
  if (!responsable) return { ok: false, error: 'El responsable seleccionado ya no existe.' };

  const errorAcceso = await assertAccesoActivo(session, parsed.data.assetId);
  if (errorAcceso) return { ok: false, error: errorAcceso };

  if (!(await validarSite(tenant.id, parsed.data.origenSiteId))) return { ok: false, error: 'La finca de origen no es válida.' };
  const destinoEsOtro = parsed.data.destino === DESTINO_OTRO;
  if (!destinoEsOtro && !(await validarSite(tenant.id, parsed.data.destino))) return { ok: false, error: 'El destino no es válido.' };

  const foto = await subirFoto(`bitacora-uso/${parsed.data.assetId}`, formData);
  if (!foto.ok) return { ok: false, error: foto.error };

  const medidor = parsed.data.lecturaSalida ? await obtenerMedidorRelevante(tenant.id, parsed.data.assetId) : null;
  if (medidor && parsed.data.lecturaSalida && !medidor.permiteRetroceso && Number(parsed.data.lecturaSalida) < Number(medidor.valorActual)) {
    return { ok: false, error: `El medidor de este activo no permite retroceso. La última lectura fue ${medidor.valorActual}.` };
  }

  const id = await dbTx.transaction(async (tx) => {
    const [fila] = await tx
      .insert(assetUsageLogs)
      .values({
        tenantId: tenant.id,
        assetId: parsed.data.assetId,
        responsableId: parsed.data.responsableId,
        origenSiteId: parsed.data.origenSiteId,
        destinoSiteId: destinoEsOtro ? null : parsed.data.destino,
        destinoOtro: destinoEsOtro ? (parsed.data.destinoOtro ?? null) : null,
        proposito: parsed.data.proposito,
        lecturaSalida: parsed.data.lecturaSalida ?? null,
        fotoSalidaUrl: foto.url,
        observaciones: parsed.data.observaciones ?? null,
        createdBy: session.user.id,
      })
      .returning({ id: assetUsageLogs.id });

    if (medidor && parsed.data.lecturaSalida) {
      await tx.insert(meterReadings).values({
        assetMeterId: medidor.assetMeterId,
        valor: parsed.data.lecturaSalida,
        origen: 'MANUAL',
        observacion: 'Salida registrada en bitácora de uso',
        createdBy: session.user.id,
      });
      await tx.update(assetMeters).set({ valorActual: parsed.data.lecturaSalida }).where(eq(assetMeters.id, medidor.assetMeterId));
    }

    return fila?.id;
  });

  if (!id) return { ok: false, error: 'No se pudo registrar la salida.' };

  await writeAudit({ tenantId: tenant.id, entidad: 'bitacora', entidadId: id, accion: 'INSERT', permiso: 'bitacora.registrar', userId: session.user.id, diff: buildDiff(null, parsed.data) });
  revalidatePath('/bitacora-uso');
  revalidatePath(`/activos/${parsed.data.assetId}/bitacora`);
  return { ok: true, id };
}

export async function registrarRegreso(id: string, input: RegresoFormValues, formData: FormData): Promise<AccionResultado> {
  const session = await requirePermission('bitacora.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'bitacora');

  const parsed = regresoBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const [registro] = await db.select().from(assetUsageLogs).where(and(eq(assetUsageLogs.id, id), eq(assetUsageLogs.tenantId, tenant.id), isNull(assetUsageLogs.deletedAt))).limit(1);
  if (!registro) return { ok: false, error: 'El registro ya no existe.' };
  if (registro.estado !== 'ABIERTO') return { ok: false, error: 'Este uso ya fue cerrado.' };

  if (!(await validarSite(tenant.id, parsed.data.llegadaSiteId))) return { ok: false, error: 'La finca de llegada no es válida.' };

  const errorAcceso = await assertAccesoActivo(session, registro.assetId);
  if (errorAcceso) return { ok: false, error: errorAcceso };

  const foto = await subirFoto(`bitacora-uso/${registro.assetId}`, formData);
  if (!foto.ok) return { ok: false, error: foto.error };

  const medidor = parsed.data.lecturaRegreso ? await obtenerMedidorRelevante(tenant.id, registro.assetId) : null;
  if (medidor && parsed.data.lecturaRegreso && !medidor.permiteRetroceso && Number(parsed.data.lecturaRegreso) < Number(medidor.valorActual)) {
    return { ok: false, error: `El medidor de este activo no permite retroceso. La última lectura fue ${medidor.valorActual}.` };
  }

  await dbTx.transaction(async (tx) => {
    await tx
      .update(assetUsageLogs)
      .set({
        estado: 'CERRADO',
        fechaRegreso: new Date(),
        llegadaSiteId: parsed.data.llegadaSiteId,
        lecturaRegreso: parsed.data.lecturaRegreso ?? null,
        fotoRegresoUrl: foto.url,
        observaciones: parsed.data.observaciones ?? registro.observaciones,
      })
      .where(eq(assetUsageLogs.id, id));

    if (medidor && parsed.data.lecturaRegreso) {
      await tx.insert(meterReadings).values({
        assetMeterId: medidor.assetMeterId,
        valor: parsed.data.lecturaRegreso,
        origen: 'MANUAL',
        observacion: 'Regreso registrado en bitácora de uso',
        createdBy: session.user.id,
      });
      await tx.update(assetMeters).set({ valorActual: parsed.data.lecturaRegreso }).where(eq(assetMeters.id, medidor.assetMeterId));
    }
  });

  await writeAudit({
    tenantId: tenant.id,
    entidad: 'bitacora',
    entidadId: id,
    accion: 'UPDATE',
    permiso: 'bitacora.registrar',
    userId: session.user.id,
    diff: { estado: { antes: 'ABIERTO', despues: 'CERRADO' } },
  });
  revalidatePath('/bitacora-uso');
  revalidatePath(`/bitacora-uso/${id}`);
  revalidatePath(`/activos/${registro.assetId}/bitacora`);
  return { ok: true, id };
}

export async function eliminarBitacora(id: string): Promise<AccionResultado> {
  const session = await requirePermission('bitacora.eliminar');
  const tenant = await getCurrentTenant();

  const [registro] = await db
    .select({ id: assetUsageLogs.id, assetId: assetUsageLogs.assetId })
    .from(assetUsageLogs)
    .where(and(eq(assetUsageLogs.id, id), eq(assetUsageLogs.tenantId, tenant.id), isNull(assetUsageLogs.deletedAt)))
    .limit(1);
  if (!registro) return { ok: false, error: 'El registro ya no existe.' };

  await db.update(assetUsageLogs).set({ deletedAt: new Date() }).where(eq(assetUsageLogs.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'bitacora', entidadId: id, accion: 'DELETE', nivel: 'CRITICO', permiso: 'bitacora.eliminar', userId: session.user.id });

  revalidatePath('/bitacora-uso');
  revalidatePath(`/activos/${registro.assetId}/bitacora`);
  return { ok: true };
}

type MedidorAsset = { tipoLectura: TipoLecturaMedidor; simboloUom: string | null };

async function obtenerMedidoresPorAsset(tenantId: string): Promise<Map<string, MedidorAsset>> {
  const filas = await db
    .select({ assetId: assetMeters.assetId, tipoLectura: meters.tipoLectura, simboloUom: uoms.simbolo })
    .from(assetMeters)
    .innerJoin(meters, eq(meters.id, assetMeters.meterId))
    .leftJoin(uoms, eq(uoms.id, meters.uomId))
    .where(and(eq(assetMeters.tenantId, tenantId), isNull(assetMeters.deletedAt), inArray(meters.tipoLectura, ['HOROMETRO', 'ODOMETRO'])))
    .orderBy(meters.tipoLectura);
  return new Map(filas.map((f) => [f.assetId, { tipoLectura: f.tipoLectura, simboloUom: f.simboloUom }]));
}

export type OpcionesBitacora = {
  assets: { value: string; label: string; tipoLectura: TipoLecturaMedidor | null; simboloUom: string | null }[];
  responsables: { value: string; label: string }[];
  sites: { value: string; label: string }[];
};

export async function obtenerOpcionesBitacora(): Promise<OpcionesBitacora> {
  const session = await requirePermission('bitacora.registrar');
  const tenant = await getCurrentTenant();
  const { scope, siteIds } = scopeDescriptor(session);

  // Igual que assertAccesoActivo: alcance SEDE solo ve activos de su(s) finca(s), más los que no tienen finca asignada.
  const alcanceActivos =
    scope === 'SEDE' ? or(siteIds.length > 0 ? inArray(locations.siteId, siteIds) : undefined, isNull(locations.siteId)) : undefined;

  const [ast, medidores, resp, sedes] = await Promise.all([
    db
      .select({ value: assets.id, label: assets.nombre, codigo: assets.codigo })
      .from(assets)
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt), alcanceActivos))
      .orderBy(assets.nombre),
    obtenerMedidoresPorAsset(tenant.id),
    db
      .select({ value: responsibles.id, label: responsibles.nombre })
      .from(responsibles)
      .where(and(eq(responsibles.tenantId, tenant.id), eq(responsibles.activo, true), isNull(responsibles.deletedAt)))
      .orderBy(responsibles.nombre),
    db.select({ value: sites.id, label: sites.nombre }).from(sites).where(and(eq(sites.tenantId, tenant.id), eq(sites.activo, true), isNull(sites.deletedAt))).orderBy(sites.nombre),
  ]);

  const assetsConMedidor = ast.map((a) => {
    const m = medidores.get(a.value);
    return { value: a.value, label: `${a.codigo} — ${a.label}`, tipoLectura: m?.tipoLectura ?? null, simboloUom: m?.simboloUom ?? null };
  });

  return { assets: assetsConMedidor, responsables: resp, sites: sedes };
}

const origenSites = alias(sites, 'origen_sites');
const destinoSites = alias(sites, 'destino_sites');
const llegadaSites = alias(sites, 'llegada_sites');

export async function obtenerBitacoraDetalle(id: string) {
  await requirePermission('bitacora.ver');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .select({
      id: assetUsageLogs.id,
      assetId: assetUsageLogs.assetId,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      responsableNombre: responsibles.nombre,
      origenNombre: origenSites.nombre,
      destinoNombre: destinoSites.nombre,
      destinoOtro: assetUsageLogs.destinoOtro,
      llegadaNombre: llegadaSites.nombre,
      proposito: assetUsageLogs.proposito,
      estado: assetUsageLogs.estado,
      fechaSalida: assetUsageLogs.fechaSalida,
      lecturaSalida: assetUsageLogs.lecturaSalida,
      fotoSalidaUrl: assetUsageLogs.fotoSalidaUrl,
      fechaRegreso: assetUsageLogs.fechaRegreso,
      lecturaRegreso: assetUsageLogs.lecturaRegreso,
      fotoRegresoUrl: assetUsageLogs.fotoRegresoUrl,
      observaciones: assetUsageLogs.observaciones,
      createdBy: assetUsageLogs.createdBy,
      assetSiteId: locations.siteId,
    })
    .from(assetUsageLogs)
    .innerJoin(assets, eq(assets.id, assetUsageLogs.assetId))
    .leftJoin(locations, eq(locations.id, assets.locationId))
    .leftJoin(responsibles, eq(responsibles.id, assetUsageLogs.responsableId))
    .leftJoin(origenSites, eq(origenSites.id, assetUsageLogs.origenSiteId))
    .leftJoin(destinoSites, eq(destinoSites.id, assetUsageLogs.destinoSiteId))
    .leftJoin(llegadaSites, eq(llegadaSites.id, assetUsageLogs.llegadaSiteId))
    .where(and(eq(assetUsageLogs.id, id), eq(assetUsageLogs.tenantId, tenant.id), isNull(assetUsageLogs.deletedAt)))
    .limit(1);

  return fila ?? null;
}

export type BitacoraAbierta = {
  id: string;
  assetCodigo: string | null;
  assetNombre: string | null;
  destinoNombre: string | null;
  destinoOtro: string | null;
  fechaSalida: Date;
};

/**
 * Versión reducida del listado, usada por la vista simplificada del Chofer (§ solo lo necesario):
 * sin paginación ni columnas de detalle, solo lo que necesita para elegir a qué viaje registrarle el regreso.
 */
export async function obtenerBitacoraAbiertos(): Promise<BitacoraAbierta[]> {
  const session = await requirePermission('bitacora.ver');
  const tenant = await getCurrentTenant();
  const { scope, userId, siteIds } = scopeDescriptor(session);

  const alcance =
    scope === 'TENANT'
      ? undefined
      : scope === 'SEDE'
        ? or(siteIds.length > 0 ? inArray(locations.siteId, siteIds) : undefined, isNull(locations.siteId), eq(assetUsageLogs.createdBy, userId))
        : eq(assetUsageLogs.createdBy, userId);

  const filas = await db
    .select({
      id: assetUsageLogs.id,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      destinoNombre: destinoSites.nombre,
      destinoOtro: assetUsageLogs.destinoOtro,
      fechaSalida: assetUsageLogs.fechaSalida,
    })
    .from(assetUsageLogs)
    .innerJoin(assets, eq(assets.id, assetUsageLogs.assetId))
    .leftJoin(locations, eq(locations.id, assets.locationId))
    .leftJoin(destinoSites, eq(destinoSites.id, assetUsageLogs.destinoSiteId))
    .where(and(eq(assetUsageLogs.tenantId, tenant.id), isNull(assetUsageLogs.deletedAt), eq(assetUsageLogs.estado, 'ABIERTO'), alcance))
    .orderBy(desc(assetUsageLogs.fechaSalida));

  return filas;
}

export async function obtenerBitacoraPorAsset(assetId: string) {
  await requirePermission('activos.ver');
  return db
    .select({
      id: assetUsageLogs.id,
      responsableNombre: responsibles.nombre,
      proposito: assetUsageLogs.proposito,
      estado: assetUsageLogs.estado,
      fechaSalida: assetUsageLogs.fechaSalida,
      fechaRegreso: assetUsageLogs.fechaRegreso,
    })
    .from(assetUsageLogs)
    .leftJoin(responsibles, eq(responsibles.id, assetUsageLogs.responsableId))
    .where(and(eq(assetUsageLogs.assetId, assetId), isNull(assetUsageLogs.deletedAt)))
    .orderBy(desc(assetUsageLogs.fechaSalida));
}
