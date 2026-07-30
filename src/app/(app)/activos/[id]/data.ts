import { cache } from 'react';
import { and, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { assets, contracts, costCenters, locations, parties, responsibleCenters } from '@/db/schema';
import { getCurrentTenant } from '@/lib/tenant';

const padres = alias(assets, 'padres');

/**
 * Ficha del activo con sus relaciones resueltas para mostrar. `cache()` la
 * deduplica entre el layout y cada pestaña dentro del mismo request — cada
 * Server Component la puede llamar sin preocuparse por ir dos veces a la BD.
 */
export const obtenerActivoDetalle = cache(async (id: string) => {
  const tenant = await getCurrentTenant();

  const [fila] = await db
    .select({
      asset: assets,
      ubicacion: locations.nombre,
      ubicacionSiteId: locations.siteId,
      centroCosto: costCenters.nombre,
      centroResponsable: responsibleCenters.nombre,
      proveedor: parties.nombre,
      contrato: contracts.nombre,
      padreId: padres.id,
      padreCodigo: padres.codigo,
      padreNombre: padres.nombre,
    })
    .from(assets)
    .leftJoin(locations, eq(locations.id, assets.locationId))
    .leftJoin(costCenters, eq(costCenters.id, assets.costCenterId))
    .leftJoin(responsibleCenters, eq(responsibleCenters.id, assets.responsibleCenterId))
    .leftJoin(parties, eq(parties.id, assets.partyId))
    .leftJoin(contracts, eq(contracts.id, assets.contractId))
    .leftJoin(padres, eq(padres.id, assets.parentId))
    .where(and(eq(assets.id, id), eq(assets.tenantId, tenant.id), isNull(assets.deletedAt)))
    .limit(1);

  return fila ?? null;
});

export const obtenerComponentes = cache(async (id: string) => {
  return db
    .select({ id: assets.id, codigo: assets.codigo, nombre: assets.nombre, estado: assets.estado })
    .from(assets)
    .where(and(eq(assets.parentId, id), isNull(assets.deletedAt)))
    .orderBy(assets.nombre);
});
