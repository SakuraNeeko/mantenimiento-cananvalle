import type { Metadata } from 'next';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assetClasses, assets, costCenters, locations } from '@/db/schema';
import { hasPermission, requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { ActivosTable } from './activos-table';
import type { ActivoRow } from './columns';

export const metadata: Metadata = { title: 'Activos' };

const COLUMNAS = {
  codigo: assets.codigo,
  nombre: assets.nombre,
  clase: assetClasses.nombre,
  estado: assets.estado,
  criticidad: assets.criticidad,
  activo: assets.activo,
};

export default async function ActivosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission('activos.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);
  const { scope, siteIds } = scopeDescriptor(session);

  // Sin alcance TENANT, un activo solo se ve si su ubicación pertenece a una sede asignada al usuario.
  const alcance = scope === 'TENANT' ? undefined : inArray(locations.siteId, siteIds.length > 0 ? siteIds : ['—']);

  const where = and(
    eq(assets.tenantId, tenant.id),
    isNull(assets.deletedAt),
    alcance,
    buildWhere(COLUMNAS, query.filters, query.search, ['codigo', 'nombre', 'fabricante', 'modelo', 'serie']),
  );
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: assets.id,
        codigo: assets.codigo,
        nombre: assets.nombre,
        clase: assetClasses.nombre,
        estado: assets.estado,
        criticidad: assets.criticidad,
        ubicacion: locations.nombre,
        centroCosto: costCenters.nombre,
        activo: assets.activo,
      })
      .from(assets)
      .leftJoin(assetClasses, eq(assetClasses.id, assets.claseId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .leftJoin(costCenters, eq(costCenters.id, assets.costCenterId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, assets.nombre))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(assets)
      .leftJoin(assetClasses, eq(assetClasses.id, assets.claseId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .where(where),
  ]);

  const data = {
    rows: rows as ActivoRow[],
    total: totalRow[0]?.n ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Activos" descripcion="Equipos, vehículos, infraestructura y herramientas que mantienes." />
      <div className="min-h-0 flex-1">
        <ActivosTable
          data={data}
          sort={query.sort}
          filters={query.filters}
          search={query.search}
          puedeCrear={hasPermission(session, 'activos.crear')}
          puedeExportar={hasPermission(session, 'activos.exportar')}
          puedeImportar={hasPermission(session, 'activos.importar')}
        />
      </div>
    </div>
  );
}
