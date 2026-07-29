'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db, dbTx } from '@/db';
import {
  archivedHistory,
  assets,
  costCenters,
  failureCauses,
  failureEffects,
  maintenanceTypes,
  materials,
  parties,
  responsibles,
  users,
  woClosingCauses,
  woComments,
  woHistory,
  woLabor,
  woMaterials,
  woOtherCosts,
  woStatusHistory,
  woTasks,
  woThirdPartyCosts,
  workOrders,
} from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { writeAudit } from '@/lib/audit';

export type AccionResultado = { ok: true } | { ok: false; error: string };

export async function obtenerOrdenesElegiblesHistoria() {
  await requirePermission('historia.enviar');
  const tenant = await getCurrentTenant();
  return db
    .select({
      id: workOrders.id,
      consecutivo: workOrders.consecutivo,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      costoTotal: workOrders.costoTotal,
      cerradaAt: workOrders.cerradaAt,
    })
    .from(workOrders)
    .leftJoin(assets, eq(assets.id, workOrders.assetId))
    .where(and(eq(workOrders.tenantId, tenant.id), eq(workOrders.estado, 'CERRADA')))
    .orderBy(desc(workOrders.cerradaAt));
}

/**
 * Envía en lote las OT cerradas seleccionadas a `wo_history`: valida que
 * cada una siga `CERRADA`, arma el snapshot inmutable (cabecera + detalle
 * en jsonb) y recién entonces pasa `work_orders.estado` a `EN_HISTORIA`.
 * Cada orden es su propia transacción — una que falle no bloquea al resto.
 */
export async function enviarAHistoria(ids: string[]): Promise<{ enviadas: number; errores: { id: string; error: string }[] }> {
  const session = await requirePermission('historia.enviar');
  const tenant = await getCurrentTenant();
  let enviadas = 0;
  const errores: { id: string; error: string }[] = [];

  for (const id of ids) {
    try {
      await dbTx.transaction(async (tx) => {
        const [ot] = await tx
          .select({
            orden: workOrders,
            assetCodigo: assets.codigo,
            assetNombre: assets.nombre,
            maintenanceTypeNombre: maintenanceTypes.nombre,
            costCenterNombre: costCenters.nombre,
            causaFallaNombre: failureCauses.nombre,
            efectoFallaNombre: failureEffects.nombre,
            causaCierreNombre: woClosingCauses.nombre,
          })
          .from(workOrders)
          .leftJoin(assets, eq(assets.id, workOrders.assetId))
          .leftJoin(maintenanceTypes, eq(maintenanceTypes.id, workOrders.maintenanceTypeId))
          .leftJoin(costCenters, eq(costCenters.id, workOrders.costCenterId))
          .leftJoin(failureCauses, eq(failureCauses.id, workOrders.causaFallaId))
          .leftJoin(failureEffects, eq(failureEffects.id, workOrders.efectoFallaId))
          .leftJoin(woClosingCauses, eq(woClosingCauses.id, workOrders.causaCierreId))
          .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id)))
          .limit(1);
        if (!ot) throw new Error('La orden ya no existe.');
        if (ot.orden.estado !== 'CERRADA') throw new Error(`${ot.orden.consecutivo}: solo se pueden enviar órdenes cerradas.`);

        const [tareas, labor, materialesLineas, terceros, otros, comentarios, historialEstados] = await Promise.all([
          tx.select().from(woTasks).where(eq(woTasks.workOrderId, id)).orderBy(woTasks.orden),
          tx
            .select({ id: woLabor.id, responsableNombre: responsibles.nombre, fecha: woLabor.fecha, horasNormales: woLabor.horasNormales, horasExtras: woLabor.horasExtras, horasNocturnas: woLabor.horasNocturnas, costoCalculado: woLabor.costoCalculado })
            .from(woLabor)
            .leftJoin(responsibles, eq(responsibles.id, woLabor.responsibleId))
            .where(eq(woLabor.workOrderId, id)),
          tx
            .select({ id: woMaterials.id, materialCodigo: materials.codigo, materialNombre: materials.nombre, cantidadEntregada: woMaterials.cantidadEntregada, costoUnitario: woMaterials.costoUnitario, costoTotal: woMaterials.costoTotal })
            .from(woMaterials)
            .leftJoin(materials, eq(materials.id, woMaterials.materialId))
            .where(eq(woMaterials.workOrderId, id)),
          tx
            .select({ id: woThirdPartyCosts.id, partyNombre: parties.nombre, descripcion: woThirdPartyCosts.descripcion, monto: woThirdPartyCosts.monto })
            .from(woThirdPartyCosts)
            .leftJoin(parties, eq(parties.id, woThirdPartyCosts.partyId))
            .where(eq(woThirdPartyCosts.workOrderId, id)),
          tx.select({ id: woOtherCosts.id, descripcion: woOtherCosts.descripcion, monto: woOtherCosts.monto }).from(woOtherCosts).where(eq(woOtherCosts.workOrderId, id)),
          tx
            .select({ id: woComments.id, mensaje: woComments.mensaje, autorNombre: users.nombre, createdAt: woComments.createdAt })
            .from(woComments)
            .leftJoin(users, eq(users.id, woComments.createdBy))
            .where(eq(woComments.workOrderId, id)),
          tx
            .select({ id: woStatusHistory.id, estadoAnterior: woStatusHistory.estadoAnterior, estadoNuevo: woStatusHistory.estadoNuevo, motivo: woStatusHistory.motivo, fecha: woStatusHistory.fecha, autorNombre: users.nombre })
            .from(woStatusHistory)
            .leftJoin(users, eq(users.id, woStatusHistory.createdBy))
            .where(eq(woStatusHistory.workOrderId, id)),
        ]);

        await tx.insert(woHistory).values({
          tenantId: tenant.id,
          workOrderId: ot.orden.id,
          consecutivo: ot.orden.consecutivo ?? '(sin consecutivo)',
          origen: ot.orden.origen,
          assetId: ot.orden.assetId,
          assetCodigo: ot.assetCodigo,
          assetNombre: ot.assetNombre,
          maintenanceTypeNombre: ot.maintenanceTypeNombre,
          costCenterId: ot.orden.costCenterId,
          costCenterNombre: ot.costCenterNombre,
          prioridad: ot.orden.prioridad,
          criticidad: ot.orden.criticidad,
          descripcionProblema: ot.orden.descripcionProblema,
          causaFallaNombre: ot.causaFallaNombre,
          efectoFallaNombre: ot.efectoFallaNombre,
          causaCierreNombre: ot.causaCierreNombre,
          fechaCreacion: ot.orden.createdAt,
          fechaProgramada: ot.orden.fechaProgramada,
          fechaInicioReal: ot.orden.fechaInicioReal,
          fechaFinReal: ot.orden.fechaFinReal,
          cerradaAt: ot.orden.cerradaAt,
          costoManoObra: ot.orden.costoManoObra,
          costoMateriales: ot.orden.costoMateriales,
          costoTerceros: ot.orden.costoTerceros,
          costoOtros: ot.orden.costoOtros,
          costoTotal: ot.orden.costoTotal,
          tiempoEstimadoHoras: ot.orden.tiempoEstimadoHoras,
          snapshot: { tareas, manoObra: labor, materiales: materialesLineas, costosTerceros: terceros, costosOtros: otros, comentarios, historialEstados },
          enviadaHistoriaBy: session.user.id,
        });

        await tx.update(workOrders).set({ estado: 'EN_HISTORIA' }).where(eq(workOrders.id, id));
      });

      await writeAudit({ tenantId: tenant.id, entidad: 'historia', entidadId: id, accion: 'INSERT', nivel: 'CRITICO', permiso: 'historia.enviar', userId: session.user.id });
      enviadas++;
    } catch (error) {
      errores.push({ id, error: error instanceof Error ? error.message : 'Error desconocido.' });
    }
  }

  revalidatePath('/historia');
  revalidatePath('/ordenes');
  return { enviadas, errores };
}

export async function obtenerHistorial(filtros: { assetId?: string; desde?: string; hasta?: string }) {
  await requirePermission('historia.ver');
  const tenant = await getCurrentTenant();
  const condiciones = [eq(woHistory.tenantId, tenant.id)];
  if (filtros.assetId) condiciones.push(eq(woHistory.assetId, filtros.assetId));
  if (filtros.desde) condiciones.push(gte(woHistory.fechaFinReal, new Date(filtros.desde)));
  if (filtros.hasta) condiciones.push(lte(woHistory.fechaFinReal, new Date(filtros.hasta)));

  return db
    .select({
      id: woHistory.id,
      consecutivo: woHistory.consecutivo,
      assetCodigo: woHistory.assetCodigo,
      assetNombre: woHistory.assetNombre,
      origen: woHistory.origen,
      fechaFinReal: woHistory.fechaFinReal,
      costoTotal: woHistory.costoTotal,
      causaCierreNombre: woHistory.causaCierreNombre,
    })
    .from(woHistory)
    .where(and(...condiciones))
    .orderBy(desc(woHistory.fechaFinReal));
}

export async function obtenerHistorialDetalle(id: string) {
  await requirePermission('historia.ver');
  const tenant = await getCurrentTenant();
  const [fila] = await db.select().from(woHistory).where(and(eq(woHistory.id, id), eq(woHistory.tenantId, tenant.id))).limit(1);
  return fila ?? null;
}

/** Mueve toda la historia de un año calendario (por `fecha_fin_real`) a `archived_history` — misma fila, solo cambia de tabla. */
export async function archivarAnio(anio: number): Promise<AccionResultado> {
  const session = await requirePermission('historia.archivar');
  const tenant = await getCurrentTenant();

  const desde = new Date(Date.UTC(anio, 0, 1));
  const hasta = new Date(Date.UTC(anio + 1, 0, 1));

  const filasReales = await db.select().from(woHistory).where(and(eq(woHistory.tenantId, tenant.id), gte(woHistory.fechaFinReal, desde), lte(woHistory.fechaFinReal, hasta)));
  if (filasReales.length === 0) return { ok: false, error: `No hay historia de ${anio} para archivar.` };

  await dbTx.transaction(async (tx) => {
    for (const fila of filasReales) {
      await tx.insert(archivedHistory).values({ ...fila, archivedBy: session.user.id });
      await tx.delete(woHistory).where(eq(woHistory.id, fila.id));
    }
  });

  await writeAudit({ tenantId: tenant.id, entidad: 'historia', entidadId: null, accion: 'DELETE', nivel: 'CRITICO', permiso: 'historia.archivar', userId: session.user.id, diff: { archivado: { antes: null, despues: `${filasReales.length} OT de ${anio}` } } });
  revalidatePath('/historia');
  revalidatePath('/historia/archivo');
  return { ok: true };
}

export async function restaurarDeArchivo(id: string): Promise<AccionResultado> {
  const session = await requirePermission('historia.restaurar');
  const tenant = await getCurrentTenant();

  const [fila] = await db.select().from(archivedHistory).where(and(eq(archivedHistory.id, id), eq(archivedHistory.tenantId, tenant.id))).limit(1);
  if (!fila) return { ok: false, error: 'Ese registro archivado ya no existe.' };

  await dbTx.transaction(async (tx) => {
    const { archivedAt: _archivedAt, archivedBy: _archivedBy, ...datos } = fila;
    await tx.insert(woHistory).values(datos);
    await tx.delete(archivedHistory).where(eq(archivedHistory.id, id));
  });

  await writeAudit({ tenantId: tenant.id, entidad: 'historia', entidadId: id, accion: 'INSERT', nivel: 'CRITICO', permiso: 'historia.restaurar', userId: session.user.id });
  revalidatePath('/historia');
  revalidatePath('/historia/archivo');
  return { ok: true };
}

export async function obtenerArchivo(filtros: { assetId?: string; anio?: number }) {
  await requirePermission('historia.ver');
  const tenant = await getCurrentTenant();
  const condiciones = [eq(archivedHistory.tenantId, tenant.id)];
  if (filtros.assetId) condiciones.push(eq(archivedHistory.assetId, filtros.assetId));
  if (filtros.anio) {
    condiciones.push(gte(archivedHistory.fechaFinReal, new Date(Date.UTC(filtros.anio, 0, 1))));
    condiciones.push(lte(archivedHistory.fechaFinReal, new Date(Date.UTC(filtros.anio + 1, 0, 1))));
  }

  return db
    .select({
      id: archivedHistory.id,
      consecutivo: archivedHistory.consecutivo,
      assetCodigo: archivedHistory.assetCodigo,
      assetNombre: archivedHistory.assetNombre,
      fechaFinReal: archivedHistory.fechaFinReal,
      costoTotal: archivedHistory.costoTotal,
      archivedAt: archivedHistory.archivedAt,
    })
    .from(archivedHistory)
    .where(and(...condiciones))
    .orderBy(desc(archivedHistory.fechaFinReal));
}

export async function obtenerActivosParaFiltro() {
  await requirePermission('historia.ver');
  const tenant = await getCurrentTenant();
  return db.select({ value: assets.id, label: assets.nombre }).from(assets).where(eq(assets.tenantId, tenant.id)).orderBy(assets.nombre);
}
