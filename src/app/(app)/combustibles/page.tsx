import type { Metadata } from 'next';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, fuelRecords, fuels, locations } from '@/db/schema';
import { hasPermission, requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { CombustiblesTable } from './combustibles-table';
import type { CombustibleRow } from './columns';

export const metadata: Metadata = { title: 'Combustibles' };

const COLUMNAS = {
  fecha: fuelRecords.fecha,
  cantidad: fuelRecords.cantidad,
  costoTotal: fuelRecords.costoTotal,
  numeroFactura: fuelRecords.numeroFactura,
};

export default async function CombustiblesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission('combustibles.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'combustibles');
  const query = parseTableQuery(await searchParams);
  const { scope, siteIds } = scopeDescriptor(session);

  // Sin alcance TENANT, una carga solo se ve si la ubicación de su activo pertenece a una sede asignada al usuario.
  const alcance = scope === 'TENANT' ? undefined : inArray(locations.siteId, siteIds.length > 0 ? siteIds : ['—']);

  const where = and(eq(fuelRecords.tenantId, tenant.id), alcance, buildWhere(COLUMNAS, query.filters, query.search, ['numeroFactura']));
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: fuelRecords.id,
        fecha: fuelRecords.fecha,
        assetCodigo: assets.codigo,
        assetNombre: assets.nombre,
        fuelNombre: fuels.nombre,
        cantidad: fuelRecords.cantidad,
        costoTotal: fuelRecords.costoTotal,
        lectura: fuelRecords.lectura,
        numeroFactura: fuelRecords.numeroFactura,
      })
      .from(fuelRecords)
      .innerJoin(assets, eq(assets.id, fuelRecords.assetId))
      .innerJoin(fuels, eq(fuels.id, fuelRecords.fuelId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, fuelRecords.fecha))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(fuelRecords)
      .innerJoin(assets, eq(assets.id, fuelRecords.assetId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .where(where),
  ]);

  const data = { rows: rows as CombustibleRow[], total: totalRow[0]?.n ?? 0, page: query.page, pageSize: query.pageSize };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Combustibles" descripcion="Registro de abastecimiento, rendimiento y detección de consumos anómalos." />
      <div className="min-h-0 flex-1">
        <CombustiblesTable data={data} sort={query.sort} filters={query.filters} search={query.search} puedeRegistrar={hasPermission(session, 'combustibles.registrar')} />
      </div>
    </div>
  );
}
