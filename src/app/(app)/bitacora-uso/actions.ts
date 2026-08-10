'use server';

import { revalidatePath } from 'next/cache';
import { put } from '@vercel/blob';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import { assetMeters, assetUsageLogs, assets, meterReadings, meters, uoms, users } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { buildDiff, writeAudit } from '@/lib/audit';
import type { TipoLecturaMedidor } from '@/lib/combustibles/medidor';
import { regresoBaseSchema, salidaBaseSchema, type RegresoFormValues, type SalidaFormValues } from '@/lib/validators/bitacora';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

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

export async function registrarSalida(input: SalidaFormValues, formData: FormData): Promise<AccionResultado> {
  const session = await requirePermission('bitacora.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'bitacora');

  const parsed = salidaBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const [asset] = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, parsed.data.assetId), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).limit(1);
  if (!asset) return { ok: false, error: 'El activo seleccionado ya no existe.' };

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
        responsableUserId: parsed.data.responsableUserId,
        proposito: parsed.data.proposito,
        lecturaSalida: parsed.data.lecturaSalida ?? null,
        fotoSalidaUrl: foto.url,
        observaciones: parsed.data.observaciones ?? null,
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
};

export async function obtenerOpcionesBitacora(): Promise<OpcionesBitacora> {
  await requirePermission('bitacora.registrar');
  const tenant = await getCurrentTenant();

  const [ast, medidores, usrs] = await Promise.all([
    db.select({ value: assets.id, label: assets.nombre, codigo: assets.codigo }).from(assets).where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).orderBy(assets.nombre),
    obtenerMedidoresPorAsset(tenant.id),
    db.select({ value: users.id, label: users.nombre }).from(users).where(and(eq(users.tenantId, tenant.id), eq(users.activo, true), isNull(users.deletedAt))).orderBy(users.nombre),
  ]);

  const assetsConMedidor = ast.map((a) => {
    const m = medidores.get(a.value);
    return { value: a.value, label: `${a.codigo} — ${a.label}`, tipoLectura: m?.tipoLectura ?? null, simboloUom: m?.simboloUom ?? null };
  });

  return { assets: assetsConMedidor, responsables: usrs };
}

export async function obtenerBitacoraDetalle(id: string) {
  await requirePermission('bitacora.ver');
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .select({
      id: assetUsageLogs.id,
      assetId: assetUsageLogs.assetId,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      responsableNombre: users.nombre,
      proposito: assetUsageLogs.proposito,
      estado: assetUsageLogs.estado,
      fechaSalida: assetUsageLogs.fechaSalida,
      lecturaSalida: assetUsageLogs.lecturaSalida,
      fotoSalidaUrl: assetUsageLogs.fotoSalidaUrl,
      fechaRegreso: assetUsageLogs.fechaRegreso,
      lecturaRegreso: assetUsageLogs.lecturaRegreso,
      fotoRegresoUrl: assetUsageLogs.fotoRegresoUrl,
      observaciones: assetUsageLogs.observaciones,
    })
    .from(assetUsageLogs)
    .innerJoin(assets, eq(assets.id, assetUsageLogs.assetId))
    .leftJoin(users, eq(users.id, assetUsageLogs.responsableUserId))
    .where(and(eq(assetUsageLogs.id, id), eq(assetUsageLogs.tenantId, tenant.id), isNull(assetUsageLogs.deletedAt)))
    .limit(1);

  return fila ?? null;
}

export async function obtenerBitacoraPorAsset(assetId: string) {
  await requirePermission('activos.ver');
  return db
    .select({
      id: assetUsageLogs.id,
      responsableNombre: users.nombre,
      proposito: assetUsageLogs.proposito,
      estado: assetUsageLogs.estado,
      fechaSalida: assetUsageLogs.fechaSalida,
      fechaRegreso: assetUsageLogs.fechaRegreso,
    })
    .from(assetUsageLogs)
    .leftJoin(users, eq(users.id, assetUsageLogs.responsableUserId))
    .where(and(eq(assetUsageLogs.assetId, assetId), isNull(assetUsageLogs.deletedAt)))
    .orderBy(desc(assetUsageLogs.fechaSalida));
}
