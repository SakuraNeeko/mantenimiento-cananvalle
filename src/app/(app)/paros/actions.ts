'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import { assets, downtimes, failureCauses, failureEffects, technicalActions, workOrders } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildDiff, writeAudit } from '@/lib/audit';
import { nextCode } from '@/lib/sequences';
import { cierreParoSchema, paroBaseSchema, type CierreParoValues, type ParoFormValues } from '@/lib/validators/paro';

export type AccionResultado = { ok: true; id?: string } | { ok: false; error: string };

/** Un paro se registra ya "confirmado" (no existe borrador): el consecutivo se asigna en la misma transacción que lo crea. */
export async function registrarParo(input: ParoFormValues): Promise<AccionResultado> {
  const session = await requirePermission('paros.registrar');
  const parsed = paroBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const [asset] = await db.select({ id: assets.id }).from(assets).where(and(eq(assets.id, parsed.data.assetId), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).limit(1);
  if (!asset) return { ok: false, error: 'El activo seleccionado ya no existe.' };

  let id = '';
  await dbTx.transaction(async (tx) => {
    const consecutivo = await nextCode(tx, tenant.id, 'PA');
    const [fila] = await tx
      .insert(downtimes)
      .values({
        tenantId: tenant.id,
        consecutivo,
        assetId: parsed.data.assetId,
        tipo: parsed.data.tipo,
        fechaInicio: new Date(parsed.data.fechaInicio),
        causaFallaId: parsed.data.causaFallaId ?? null,
        efectoFallaId: parsed.data.efectoFallaId ?? null,
        technicalActionId: parsed.data.technicalActionId ?? null,
        observaciones: parsed.data.observaciones ?? null,
        responsableReporteUserId: session.user.id,
      })
      .returning({ id: downtimes.id });
    id = fila?.id ?? '';
  });

  if (!id) return { ok: false, error: 'No se pudo registrar el paro.' };

  await writeAudit({ tenantId: tenant.id, entidad: 'paros', entidadId: id, accion: 'INSERT', permiso: 'paros.registrar', userId: session.user.id, diff: buildDiff(null, parsed.data) });
  revalidatePath('/paros');
  return { ok: true, id };
}

export async function actualizarParo(id: string, input: ParoFormValues): Promise<AccionResultado> {
  const session = await requirePermission('paros.editar');
  const parsed = paroBaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const [paro] = await db.select().from(downtimes).where(and(eq(downtimes.id, id), eq(downtimes.tenantId, tenant.id))).limit(1);
  if (!paro) return { ok: false, error: 'El paro ya no existe.' };
  if (paro.estado !== 'ABIERTO') return { ok: false, error: 'Solo se puede editar un paro abierto.' };

  await db
    .update(downtimes)
    .set({
      assetId: parsed.data.assetId,
      tipo: parsed.data.tipo,
      fechaInicio: new Date(parsed.data.fechaInicio),
      causaFallaId: parsed.data.causaFallaId ?? null,
      efectoFallaId: parsed.data.efectoFallaId ?? null,
      technicalActionId: parsed.data.technicalActionId ?? null,
      observaciones: parsed.data.observaciones ?? null,
    })
    .where(eq(downtimes.id, id));

  await writeAudit({ tenantId: tenant.id, entidad: 'paros', entidadId: id, accion: 'UPDATE', permiso: 'paros.editar', userId: session.user.id, diff: buildDiff(paro as unknown as Record<string, unknown>, parsed.data) });
  revalidatePath(`/paros/${id}`);
  revalidatePath('/paros');
  return { ok: true, id };
}

export async function cerrarParo(id: string, input: CierreParoValues): Promise<AccionResultado> {
  const session = await requirePermission('paros.cerrar');
  const parsed = cierreParoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };

  const tenant = await getCurrentTenant();
  const [paro] = await db.select().from(downtimes).where(and(eq(downtimes.id, id), eq(downtimes.tenantId, tenant.id))).limit(1);
  if (!paro) return { ok: false, error: 'El paro ya no existe.' };
  if (paro.estado !== 'ABIERTO') return { ok: false, error: 'Este paro ya está cerrado.' };

  const fechaFin = new Date(parsed.data.fechaFin);
  if (fechaFin.getTime() < paro.fechaInicio.getTime()) return { ok: false, error: 'La fecha de fin no puede ser anterior al inicio.' };
  const duracionMinutos = (fechaFin.getTime() - paro.fechaInicio.getTime()) / 60_000;

  await db
    .update(downtimes)
    .set({
      estado: 'CERRADO',
      fechaFin,
      duracionMinutos: String(duracionMinutos),
      causaFallaId: parsed.data.causaFallaId ?? paro.causaFallaId,
      efectoFallaId: parsed.data.efectoFallaId ?? paro.efectoFallaId,
      technicalActionId: parsed.data.technicalActionId ?? paro.technicalActionId,
      impactoUnidadesNoProducidas: parsed.data.impactoUnidadesNoProducidas ?? null,
      impactoCostoEstimado: parsed.data.impactoCostoEstimado ?? null,
    })
    .where(eq(downtimes.id, id));

  await writeAudit({ tenantId: tenant.id, entidad: 'paros', entidadId: id, accion: 'UPDATE', permiso: 'paros.cerrar', userId: session.user.id, diff: { estado: { antes: 'ABIERTO', despues: 'CERRADO' } } });
  revalidatePath(`/paros/${id}`);
  revalidatePath('/paros');
  return { ok: true, id };
}

/** Paro → OT correctiva (§7.5): arrastra activo, causa y efecto de falla; mantiene el vínculo bidireccional. */
export async function convertirParoEnOrden(id: string): Promise<AccionResultado> {
  const session = await requirePermission('paros.convertir_ot');
  await requirePermission('ordenes.crear');
  const tenant = await getCurrentTenant();

  const [paro] = await db.select().from(downtimes).where(and(eq(downtimes.id, id), eq(downtimes.tenantId, tenant.id))).limit(1);
  if (!paro) return { ok: false, error: 'El paro ya no existe.' };
  if (paro.workOrderId) return { ok: false, error: 'Este paro ya tiene una orden de trabajo asociada.' };

  const [asset] = await db.select({ locationId: assets.locationId, costCenterId: assets.costCenterId, responsibleCenterId: assets.responsibleCenterId, criticidad: assets.criticidad, codigo: assets.codigo, nombre: assets.nombre }).from(assets).where(eq(assets.id, paro.assetId)).limit(1);
  if (!asset) return { ok: false, error: 'El activo de este paro ya no existe.' };

  let otId = '';
  await dbTx.transaction(async (tx) => {
    const [ot] = await tx
      .insert(workOrders)
      .values({
        tenantId: tenant.id,
        origen: 'PARO',
        assetId: paro.assetId,
        locationId: asset.locationId,
        costCenterId: asset.costCenterId,
        responsibleCenterId: asset.responsibleCenterId,
        criticidad: asset.criticidad,
        prioridad: paro.tipo === 'NO_PROGRAMADO' ? 'ALTA' : 'MEDIA',
        descripcionProblema: `Correctiva por paro ${paro.consecutivo} — ${asset.codigo} ${asset.nombre}.${paro.observaciones ? ` ${paro.observaciones}` : ''}`,
        causaFallaId: paro.causaFallaId,
        efectoFallaId: paro.efectoFallaId,
        technicalActionId: paro.technicalActionId,
        requiereParo: true,
      })
      .returning({ id: workOrders.id });
    otId = ot?.id ?? '';
    if (!otId) throw new Error('No se pudo crear la orden de trabajo.');

    await tx.update(downtimes).set({ workOrderId: otId }).where(eq(downtimes.id, id));
  });

  await writeAudit({ tenantId: tenant.id, entidad: 'ordenes', entidadId: otId, accion: 'INSERT', permiso: 'ordenes.crear', userId: session.user.id, diff: { origen: { antes: null, despues: `PARO ${paro.consecutivo}` } } });
  revalidatePath('/paros');
  revalidatePath(`/paros/${id}`);
  revalidatePath('/ordenes');
  return { ok: true, id: otId };
}

export type OpcionesParo = {
  assets: { value: string; label: string }[];
  failureCauses: { value: string; label: string }[];
  failureEffects: { value: string; label: string }[];
  technicalActions: { value: string; label: string }[];
};

export async function obtenerOpcionesParo(): Promise<OpcionesParo> {
  await requirePermission('paros.registrar');
  const tenant = await getCurrentTenant();
  const activo = <T extends { tenantId: unknown; activo: unknown; deletedAt: unknown }>(t: T) => and(eq(t.tenantId as never, tenant.id), eq(t.activo as never, true), isNull(t.deletedAt as never));

  const [ast, causas, efectos, acciones] = await Promise.all([
    db.select({ value: assets.id, label: assets.nombre }).from(assets).where(and(eq(assets.tenantId, tenant.id), isNull(assets.deletedAt))).orderBy(assets.nombre),
    db.select({ value: failureCauses.id, label: failureCauses.nombre }).from(failureCauses).where(activo(failureCauses)).orderBy(failureCauses.nombre),
    db.select({ value: failureEffects.id, label: failureEffects.nombre }).from(failureEffects).where(activo(failureEffects)).orderBy(failureEffects.nombre),
    db.select({ value: technicalActions.id, label: technicalActions.nombre }).from(technicalActions).where(activo(technicalActions)).orderBy(technicalActions.nombre),
  ]);

  return { assets: ast, failureCauses: causas, failureEffects: efectos, technicalActions: acciones };
}
