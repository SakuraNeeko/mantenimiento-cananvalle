import { cache } from 'react';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, locations, maintenancePlans, maintenanceTypes, planResources, planTasks, planTriggers, responsibles, workTypes } from '@/db/schema';
import { getCurrentTenant } from '@/lib/tenant';

export const obtenerPlanDetalle = cache(async (id: string) => {
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .select({
      plan: maintenancePlans,
      assetNombre: assets.nombre,
      assetCodigo: assets.codigo,
      maintenanceTypeNombre: maintenanceTypes.nombre,
      workTypeNombre: workTypes.nombre,
      locationFiltroNombre: locations.nombre,
      responsableNombre: responsibles.nombre,
    })
    .from(maintenancePlans)
    .leftJoin(assets, eq(assets.id, maintenancePlans.assetId))
    .leftJoin(maintenanceTypes, eq(maintenanceTypes.id, maintenancePlans.maintenanceTypeId))
    .leftJoin(workTypes, eq(workTypes.id, maintenancePlans.workTypeId))
    .leftJoin(locations, eq(locations.id, maintenancePlans.locationFiltro))
    .leftJoin(responsibles, eq(responsibles.id, maintenancePlans.responsibleDefaultId))
    .where(and(eq(maintenancePlans.id, id), eq(maintenancePlans.tenantId, tenant.id)))
    .limit(1);

  return fila ?? null;
});

export const obtenerTriggersPlan = cache(async (id: string) => {
  return db.select().from(planTriggers).where(eq(planTriggers.planId, id)).orderBy(planTriggers.createdAt);
});

export const obtenerTareasPlan = cache(async (id: string) => {
  const { trades } = await import('@/db/schema');
  return db
    .select({
      id: planTasks.id,
      orden: planTasks.orden,
      descripcion: planTasks.descripcion,
      tipoRespuesta: planTasks.tipoRespuesta,
      esCritica: planTasks.esCritica,
      tradeId: planTasks.tradeId,
      tradeNombre: trades.nombre,
      duracionMinutos: planTasks.duracionMinutos,
      instrucciones: planTasks.instrucciones,
    })
    .from(planTasks)
    .leftJoin(trades, eq(trades.id, planTasks.tradeId))
    .where(eq(planTasks.planId, id))
    .orderBy(planTasks.orden);
});

export const obtenerRecursosPlan = cache(async (id: string) => {
  const { trades, materials } = await import('@/db/schema');
  return db
    .select({
      id: planResources.id,
      tipo: planResources.tipo,
      tradeId: planResources.tradeId,
      tradeNombre: trades.nombre,
      horasEstimadas: planResources.horasEstimadas,
      materialId: planResources.materialId,
      materialCodigo: materials.codigo,
      materialNombre: materials.nombre,
      cantidadEstimada: planResources.cantidadEstimada,
      costoEstimado: planResources.costoEstimado,
    })
    .from(planResources)
    .leftJoin(trades, eq(trades.id, planResources.tradeId))
    .leftJoin(materials, eq(materials.id, planResources.materialId))
    .where(eq(planResources.planId, id))
    .orderBy(planResources.createdAt);
});
