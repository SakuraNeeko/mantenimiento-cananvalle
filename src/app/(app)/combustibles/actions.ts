'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import { assetMeters, assets, fuelRecords, fuels, meterReadings, meters, parties, uoms, users } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { buildDiff, writeAudit } from '@/lib/audit';
import { calcularRendimientoAsset, type RegistroConRendimiento } from '@/lib/combustibles/rendimiento';
import type { TipoLecturaMedidor } from '@/lib/combustibles/medidor';
import { z } from 'zod';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

const registroSchema = z.object({
  assetId: z.string().trim().min(1, 'Selecciona el activo.'),
  fuelId: z.string().trim().min(1, 'Selecciona el tipo de combustible.'),
  fecha: z.string().trim().min(1, 'Indica la fecha.'),
  cantidad: z.string().trim().refine((v) => Number(v) > 0, 'La cantidad debe ser mayor a 0.'),
  costoUnitario: z.string().trim().refine((v) => Number(v) >= 0, 'El costo unitario no puede ser negativo.'),
  lectura: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  partyId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  conductorUserId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  numeroFactura: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  observaciones: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type RegistroCombustibleValues = z.infer<typeof registroSchema>;

/**
 * El medidor (horómetro/odómetro) real de un activo, si tiene uno configurado en Infraestructura.
 * Una carga de combustible con "lectura" alimenta este medidor en vez de quedar como un número
 * suelto — así el rendimiento y los disparadores de plan por contador leen un único dato.
 */
async function obtenerMedidorRelevante(tenantId: string, assetId: string) {
  const [fila] = await db
    .select({ assetMeterId: assetMeters.id, valorActual: assetMeters.valorActual, permiteRetroceso: meters.permiteRetroceso })
    .from(assetMeters)
    .innerJoin(meters, eq(meters.id, assetMeters.meterId))
    .where(and(eq(assetMeters.assetId, assetId), eq(assetMeters.tenantId, tenantId), isNull(assetMeters.deletedAt), inArray(meters.tipoLectura, ['HOROMETRO', 'ODOMETRO'])))
    .limit(1);
  return fila ?? null;
}

export async function registrarCombustible(input: RegistroCombustibleValues): Promise<AccionResultado> {
  const session = await requirePermission('combustibles.registrar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'combustibles');

  const parsed = registroSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const costoTotal = Number(parsed.data.cantidad) * Number(parsed.data.costoUnitario);

  const medidor = parsed.data.lectura ? await obtenerMedidorRelevante(tenant.id, parsed.data.assetId) : null;
  if (medidor && parsed.data.lectura && !medidor.permiteRetroceso && Number(parsed.data.lectura) < Number(medidor.valorActual)) {
    return { ok: false, error: `El medidor de este activo no permite retroceso. La última lectura fue ${medidor.valorActual}.` };
  }

  const id = await dbTx.transaction(async (tx) => {
    const [fila] = await tx
      .insert(fuelRecords)
      .values({
        tenantId: tenant.id,
        assetId: parsed.data.assetId,
        fuelId: parsed.data.fuelId,
        fecha: new Date(parsed.data.fecha),
        cantidad: parsed.data.cantidad,
        costoUnitario: parsed.data.costoUnitario,
        costoTotal: String(costoTotal),
        lectura: parsed.data.lectura ?? null,
        partyId: parsed.data.partyId ?? null,
        conductorUserId: parsed.data.conductorUserId ?? null,
        numeroFactura: parsed.data.numeroFactura ?? null,
        observaciones: parsed.data.observaciones ?? null,
      })
      .returning({ id: fuelRecords.id });

    if (medidor && parsed.data.lectura) {
      await tx.insert(meterReadings).values({
        assetMeterId: medidor.assetMeterId,
        valor: parsed.data.lectura,
        origen: 'COMBUSTIBLE',
        observacion: `Carga de combustible: ${parsed.data.cantidad}`,
        createdBy: session.user.id,
      });
      await tx.update(assetMeters).set({ valorActual: parsed.data.lectura }).where(eq(assetMeters.id, medidor.assetMeterId));
    }

    return fila?.id;
  });

  if (!id) return { ok: false, error: 'No se pudo registrar el abastecimiento.' };

  await writeAudit({ tenantId: tenant.id, entidad: 'combustibles', entidadId: id, accion: 'INSERT', permiso: 'combustibles.registrar', userId: session.user.id, diff: buildDiff(null, parsed.data) });
  revalidatePath('/combustibles');
  if (medidor) revalidatePath(`/activos/${parsed.data.assetId}/medidores`);
  return { ok: true, id };
}

export async function editarCombustible(id: string, input: RegistroCombustibleValues): Promise<AccionResultado> {
  const session = await requirePermission('combustibles.editar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'combustibles');

  const parsed = registroSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const [registro] = await db.select().from(fuelRecords).where(and(eq(fuelRecords.id, id), eq(fuelRecords.tenantId, tenant.id))).limit(1);
  if (!registro) return { ok: false, error: 'El registro ya no existe.' };

  const costoTotal = Number(parsed.data.cantidad) * Number(parsed.data.costoUnitario);

  await db
    .update(fuelRecords)
    .set({
      assetId: parsed.data.assetId,
      fuelId: parsed.data.fuelId,
      fecha: new Date(parsed.data.fecha),
      cantidad: parsed.data.cantidad,
      costoUnitario: parsed.data.costoUnitario,
      costoTotal: String(costoTotal),
      lectura: parsed.data.lectura ?? null,
      partyId: parsed.data.partyId ?? null,
      conductorUserId: parsed.data.conductorUserId ?? null,
      numeroFactura: parsed.data.numeroFactura ?? null,
      observaciones: parsed.data.observaciones ?? null,
    })
    .where(eq(fuelRecords.id, id));

  await writeAudit({ tenantId: tenant.id, entidad: 'combustibles', entidadId: id, accion: 'UPDATE', permiso: 'combustibles.editar', userId: session.user.id, diff: buildDiff(registro as unknown as Record<string, unknown>, parsed.data) });
  revalidatePath('/combustibles');
  return { ok: true, id };
}

export async function eliminarCombustible(id: string): Promise<AccionResultado> {
  const session = await requirePermission('combustibles.editar');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'combustibles');

  const [registro] = await db.select({ id: fuelRecords.id }).from(fuelRecords).where(and(eq(fuelRecords.id, id), eq(fuelRecords.tenantId, tenant.id))).limit(1);
  if (!registro) return { ok: false, error: 'El registro ya no existe.' };

  await db.delete(fuelRecords).where(eq(fuelRecords.id, id));
  await writeAudit({ tenantId: tenant.id, entidad: 'combustibles', entidadId: id, accion: 'DELETE', nivel: 'CRITICO', permiso: 'combustibles.editar', userId: session.user.id });
  revalidatePath('/combustibles');
  return { ok: true };
}

type MedidorAsset = { tipoLectura: TipoLecturaMedidor; simboloUom: string | null };

/** Medidor de horómetro/odómetro por activo, para etiquetar la unidad de "Lectura" en la UI de Combustibles. */
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

export type OpcionesCombustible = {
  assets: { value: string; label: string; tipoLectura: TipoLecturaMedidor | null; simboloUom: string | null }[];
  fuels: { value: string; label: string }[];
  parties: { value: string; label: string }[];
  conductores: { value: string; label: string }[];
};

export async function obtenerOpcionesCombustible(): Promise<OpcionesCombustible> {
  await requirePermission('combustibles.registrar');
  const tenant = await getCurrentTenant();

  const [ast, medidores, fls, prts, usrs] = await Promise.all([
    db.select({ value: assets.id, label: assets.nombre }).from(assets).where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).orderBy(assets.nombre),
    obtenerMedidoresPorAsset(tenant.id),
    db.select({ value: fuels.id, label: fuels.nombre }).from(fuels).where(and(eq(fuels.tenantId, tenant.id), eq(fuels.activo, true), isNull(fuels.deletedAt))).orderBy(fuels.nombre),
    db.select({ value: parties.id, label: parties.nombre }).from(parties).where(and(eq(parties.tenantId, tenant.id), eq(parties.activo, true), isNull(parties.deletedAt))).orderBy(parties.nombre),
    db.select({ value: users.id, label: users.nombre }).from(users).where(and(eq(users.tenantId, tenant.id), eq(users.activo, true), isNull(users.deletedAt))).orderBy(users.nombre),
  ]);

  const assetsConMedidor = ast.map((a) => {
    const m = medidores.get(a.value);
    return { ...a, tipoLectura: m?.tipoLectura ?? null, simboloUom: m?.simboloUom ?? null };
  });

  return { assets: assetsConMedidor, fuels: fls, parties: prts, conductores: usrs };
}

export async function obtenerOpcionesAssetsCombustible() {
  await requirePermission('combustibles.ver');
  const tenant = await getCurrentTenant();
  const [ast, medidores] = await Promise.all([
    db.select({ value: assets.id, label: assets.nombre, codigo: assets.codigo }).from(assets).where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).orderBy(assets.nombre),
    obtenerMedidoresPorAsset(tenant.id),
  ]);
  return ast.map((a) => {
    const m = medidores.get(a.value);
    return { ...a, tipoLectura: m?.tipoLectura ?? null, simboloUom: m?.simboloUom ?? null };
  });
}

export async function obtenerRendimientoAsset(assetId: string): Promise<RegistroConRendimiento[]> {
  await requirePermission('combustibles.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'combustibles');
  return calcularRendimientoAsset(tenant.id, assetId);
}
