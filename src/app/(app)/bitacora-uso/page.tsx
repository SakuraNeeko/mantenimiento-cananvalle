import type { Metadata } from 'next';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { assetUsageLogs, assets, locations, responsibles, sites } from '@/db/schema';
import { hasPermission, requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { BitacoraTable } from './bitacora-table';
import type { BitacoraRow } from './columns';

export const metadata: Metadata = { title: 'Bitácora de uso' };

const COLUMNAS = {
  assetNombre: assets.nombre,
  estado: assetUsageLogs.estado,
  fechaSalida: assetUsageLogs.fechaSalida,
};

const origenSites = alias(sites, 'origen_sites');
const destinoSites = alias(sites, 'destino_sites');
const llegadaSites = alias(sites, 'llegada_sites');

export default async function BitacoraUsoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission('bitacora.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'bitacora');
  const query = parseTableQuery(await searchParams);
  const { scope, userId, siteIds } = scopeDescriptor(session);

  // Un activo sin finca asignada se ve siempre; fuera de eso, cada quién ve su(s) sede(s) o lo que él mismo registró
  // (no el responsable/chofer — ese puede no tener cuenta en el sistema).
  const alcance =
    scope === 'TENANT'
      ? undefined
      : scope === 'SEDE'
        ? or(siteIds.length > 0 ? inArray(locations.siteId, siteIds) : undefined, isNull(locations.siteId), eq(assetUsageLogs.createdBy, userId))
        : eq(assetUsageLogs.createdBy, userId);

  const where = and(
    eq(assetUsageLogs.tenantId, tenant.id),
    isNull(assetUsageLogs.deletedAt),
    alcance,
    buildWhere(COLUMNAS, query.filters, query.search, ['proposito']),
  );
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: assetUsageLogs.id,
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
        fechaRegreso: assetUsageLogs.fechaRegreso,
      })
      .from(assetUsageLogs)
      .innerJoin(assets, eq(assets.id, assetUsageLogs.assetId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .leftJoin(responsibles, eq(responsibles.id, assetUsageLogs.responsableId))
      .leftJoin(origenSites, eq(origenSites.id, assetUsageLogs.origenSiteId))
      .leftJoin(destinoSites, eq(destinoSites.id, assetUsageLogs.destinoSiteId))
      .leftJoin(llegadaSites, eq(llegadaSites.id, assetUsageLogs.llegadaSiteId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, assetUsageLogs.fechaSalida))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(assetUsageLogs)
      .innerJoin(assets, eq(assets.id, assetUsageLogs.assetId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .where(where),
  ]);

  const data = { rows: rows as BitacoraRow[], total: totalRow[0]?.n ?? 0, page: query.page, pageSize: query.pageSize };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Bitácora de uso" descripcion="Quién usa cada vehículo o equipo, para qué y con qué estado — con foto de salida y de regreso." />
      <div className="min-h-0 flex-1">
        <BitacoraTable data={data} sort={query.sort} filters={query.filters} search={query.search} puedeRegistrar={hasPermission(session, 'bitacora.registrar')} />
      </div>
    </div>
  );
}
