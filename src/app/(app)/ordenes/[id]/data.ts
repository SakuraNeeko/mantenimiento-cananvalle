import { cache } from 'react';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  costCenters,
  failureCauses,
  failureEffects,
  locations,
  maintenanceTypes,
  parties,
  responsibleCenters,
  responsibles,
  serviceRequests,
  technicalActions,
  users,
  warehouses,
  woClosingCauses,
  woLabor,
  woMaterials,
  woOtherCosts,
  woPendingCauses,
  woTasks,
  woThirdPartyCosts,
  workOrders,
  workTypes,
} from '@/db/schema';
import { getCurrentTenant } from '@/lib/tenant';

const responsablePrincipal = users;

/** Ficha de la OT con sus relaciones resueltas. `cache()` la deduplica entre el layout y cada pestaña. */
export const obtenerOrdenDetalle = cache(async (id: string) => {
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .select({
      orden: workOrders,
      assetCodigo: assets.codigo,
      assetNombre: assets.nombre,
      locationNombre: locations.nombre,
      locationSiteId: locations.siteId,
      costCenterNombre: costCenters.nombre,
      responsibleCenterNombre: responsibleCenters.nombre,
      maintenanceTypeNombre: maintenanceTypes.nombre,
      workTypeNombre: workTypes.nombre,
      responsableNombre: responsablePrincipal.nombre,
      partyNombre: parties.nombre,
      warehouseNombre: warehouses.nombre,
      causaFallaNombre: failureCauses.nombre,
      efectoFallaNombre: failureEffects.nombre,
      technicalActionNombre: technicalActions.nombre,
      causaPendienteNombre: woPendingCauses.nombre,
      causaCierreNombre: woClosingCauses.nombre,
      solicitudConsecutivo: serviceRequests.consecutivo,
    })
    .from(workOrders)
    .leftJoin(assets, eq(assets.id, workOrders.assetId))
    .leftJoin(locations, eq(locations.id, workOrders.locationId))
    .leftJoin(costCenters, eq(costCenters.id, workOrders.costCenterId))
    .leftJoin(responsibleCenters, eq(responsibleCenters.id, workOrders.responsibleCenterId))
    .leftJoin(maintenanceTypes, eq(maintenanceTypes.id, workOrders.maintenanceTypeId))
    .leftJoin(workTypes, eq(workTypes.id, workOrders.workTypeId))
    .leftJoin(responsablePrincipal, eq(responsablePrincipal.id, workOrders.responsablePrincipalUserId))
    .leftJoin(parties, eq(parties.id, workOrders.partyId))
    .leftJoin(warehouses, eq(warehouses.id, workOrders.warehouseId))
    .leftJoin(failureCauses, eq(failureCauses.id, workOrders.causaFallaId))
    .leftJoin(failureEffects, eq(failureEffects.id, workOrders.efectoFallaId))
    .leftJoin(technicalActions, eq(technicalActions.id, workOrders.technicalActionId))
    .leftJoin(woPendingCauses, eq(woPendingCauses.id, workOrders.causaPendienteId))
    .leftJoin(woClosingCauses, eq(woClosingCauses.id, workOrders.causaCierreId))
    .leftJoin(serviceRequests, eq(serviceRequests.id, workOrders.serviceRequestId))
    .where(and(eq(workOrders.id, id), eq(workOrders.tenantId, tenant.id)))
    .limit(1);

  return fila ?? null;
});

export const obtenerTareasOrden = cache(async (id: string) => {
  return db.select().from(woTasks).where(eq(woTasks.workOrderId, id)).orderBy(woTasks.orden);
});

export const obtenerManoObraOrden = cache(async (id: string) => {
  return db
    .select({
      id: woLabor.id,
      responsibleId: woLabor.responsibleId,
      responsableNombre: responsibles.nombre,
      fecha: woLabor.fecha,
      horasNormales: woLabor.horasNormales,
      horasExtras: woLabor.horasExtras,
      horasNocturnas: woLabor.horasNocturnas,
      costoCalculado: woLabor.costoCalculado,
    })
    .from(woLabor)
    .leftJoin(responsibles, eq(responsibles.id, woLabor.responsibleId))
    .where(eq(woLabor.workOrderId, id))
    .orderBy(woLabor.fecha);
});

export const obtenerMaterialesOrden = cache(async (id: string) => {
  const { materials, uoms } = await import('@/db/schema');
  return db
    .select({
      id: woMaterials.id,
      materialId: woMaterials.materialId,
      materialCodigo: materials.codigo,
      materialNombre: materials.nombre,
      uomSimbolo: uoms.simbolo,
      cantidadSolicitada: woMaterials.cantidadSolicitada,
      cantidadEntregada: woMaterials.cantidadEntregada,
      costoUnitario: woMaterials.costoUnitario,
      costoTotal: woMaterials.costoTotal,
      kardexMovementId: woMaterials.kardexMovementId,
    })
    .from(woMaterials)
    .leftJoin(materials, eq(materials.id, woMaterials.materialId))
    .leftJoin(uoms, eq(uoms.id, materials.uomId))
    .where(eq(woMaterials.workOrderId, id))
    .orderBy(woMaterials.createdAt);
});

export const obtenerCostosTercerosOrden = cache(async (id: string) => {
  return db
    .select({ id: woThirdPartyCosts.id, partyId: woThirdPartyCosts.partyId, partyNombre: parties.nombre, descripcion: woThirdPartyCosts.descripcion, monto: woThirdPartyCosts.monto })
    .from(woThirdPartyCosts)
    .leftJoin(parties, eq(parties.id, woThirdPartyCosts.partyId))
    .where(eq(woThirdPartyCosts.workOrderId, id))
    .orderBy(woThirdPartyCosts.createdAt);
});

export const obtenerCostosOtrosOrden = cache(async (id: string) => {
  const { otherCostConcepts } = await import('@/db/schema');
  return db
    .select({ id: woOtherCosts.id, otherCostConceptId: woOtherCosts.otherCostConceptId, conceptoNombre: otherCostConcepts.nombre, descripcion: woOtherCosts.descripcion, monto: woOtherCosts.monto })
    .from(woOtherCosts)
    .leftJoin(otherCostConcepts, eq(otherCostConcepts.id, woOtherCosts.otherCostConceptId))
    .where(eq(woOtherCosts.workOrderId, id))
    .orderBy(woOtherCosts.createdAt);
});
