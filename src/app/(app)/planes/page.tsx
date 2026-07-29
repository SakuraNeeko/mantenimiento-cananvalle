import type { Metadata } from 'next';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, maintenancePlans, maintenanceTypes } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { PlanesTable } from './planes-table';
import type { PlanRow } from './columns';

export const metadata: Metadata = { title: 'Planes de mantenimiento' };

const COLUMNAS = {
  codigo: maintenancePlans.codigo,
  nombre: maintenancePlans.nombre,
  alcance: maintenancePlans.alcance,
  prioridad: maintenancePlans.prioridad,
  activo: maintenancePlans.activo,
};

export default async function PlanesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission('planes.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);

  const where = and(eq(maintenancePlans.tenantId, tenant.id), isNull(maintenancePlans.deletedAt), buildWhere(COLUMNAS, query.filters, query.search, ['codigo', 'nombre']));
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: maintenancePlans.id,
        codigo: maintenancePlans.codigo,
        nombre: maintenancePlans.nombre,
        alcance: maintenancePlans.alcance,
        prioridad: maintenancePlans.prioridad,
        activo: maintenancePlans.activo,
        assetNombre: assets.nombre,
        maintenanceTypeNombre: maintenanceTypes.nombre,
      })
      .from(maintenancePlans)
      .leftJoin(assets, eq(assets.id, maintenancePlans.assetId))
      .leftJoin(maintenanceTypes, eq(maintenanceTypes.id, maintenancePlans.maintenanceTypeId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, maintenancePlans.nombre))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(maintenancePlans).where(where),
  ]);

  const data = { rows: rows as PlanRow[], total: totalRow[0]?.n ?? 0, page: query.page, pageSize: query.pageSize };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Planes de mantenimiento" descripcion="Plantillas que generan órdenes de trabajo automáticamente según sus disparadores." />
      <div className="min-h-0 flex-1">
        <PlanesTable
          data={data}
          sort={query.sort}
          filters={query.filters}
          search={query.search}
          puedeCrear={hasPermission(session, 'planes.gestionar')}
          puedeGenerar={hasPermission(session, 'planes.generar_ot')}
        />
      </div>
    </div>
  );
}
