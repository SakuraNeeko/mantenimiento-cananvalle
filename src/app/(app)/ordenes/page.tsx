import type { Metadata } from 'next';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, locations, users, workOrders } from '@/db/schema';
import { hasPermission, requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { OrdenesView } from './ordenes-view';
import type { OrdenRow } from './columns';

export const metadata: Metadata = { title: 'Órdenes de trabajo' };

const COLUMNAS = {
  consecutivo: workOrders.consecutivo,
  descripcionProblema: workOrders.descripcionProblema,
  prioridad: workOrders.prioridad,
  criticidad: workOrders.criticidad,
  estado: workOrders.estado,
  fechaProgramada: workOrders.fechaProgramada,
  createdAt: workOrders.createdAt,
};

const KANBAN_ESTADOS = ['BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE', 'EJECUTADA', 'LIQUIDADA'] as const;

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission('ordenes.ver');
  const tenant = await getCurrentTenant();
  const sp = await searchParams;
  const query = parseTableQuery(sp);
  const vista = sp.vista === 'kanban' ? 'kanban' : 'lista';
  const { scope, userId, siteIds } = scopeDescriptor(session);

  const alcance =
    scope === 'TENANT'
      ? undefined
      : scope === 'SEDE'
        ? or(siteIds.length > 0 ? inArray(locations.siteId, siteIds) : undefined, eq(workOrders.responsablePrincipalUserId, userId))
        : eq(workOrders.responsablePrincipalUserId, userId);

  const baseSelect = {
    id: workOrders.id,
    consecutivo: workOrders.consecutivo,
    descripcionProblema: workOrders.descripcionProblema,
    prioridad: workOrders.prioridad,
    criticidad: workOrders.criticidad,
    estado: workOrders.estado,
    assetNombre: assets.nombre,
    responsableNombre: users.nombre,
    fechaProgramada: workOrders.fechaProgramada,
    createdAt: workOrders.createdAt,
  };

  if (vista === 'kanban') {
    const where = and(eq(workOrders.tenantId, tenant.id), alcance, inArray(workOrders.estado, [...KANBAN_ESTADOS]));
    const rows = await db
      .select(baseSelect)
      .from(workOrders)
      .leftJoin(assets, eq(assets.id, workOrders.assetId))
      .leftJoin(locations, eq(locations.id, workOrders.locationId))
      .leftJoin(users, eq(users.id, workOrders.responsablePrincipalUserId))
      .where(where)
      .orderBy(workOrders.createdAt)
      .limit(300);

    return (
      <div className="flex h-full flex-col gap-3">
        <PageHeader titulo="Órdenes de trabajo" descripcion="El módulo central de mantenimiento: planificación, ejecución y costos." />
        <div className="min-h-0 flex-1">
          <OrdenesView vista="kanban" kanbanRows={rows as OrdenRow[]} puedeCrear={hasPermission(session, 'ordenes.crear')} data={{ rows: [], total: 0, page: 1, pageSize: 50 }} sort={query.sort} filters={query.filters} search={query.search} />
        </div>
      </div>
    );
  }

  const where = and(eq(workOrders.tenantId, tenant.id), alcance, buildWhere(COLUMNAS, query.filters, query.search, ['consecutivo', 'descripcionProblema']));
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select(baseSelect)
      .from(workOrders)
      .leftJoin(assets, eq(assets.id, workOrders.assetId))
      .leftJoin(locations, eq(locations.id, workOrders.locationId))
      .leftJoin(users, eq(users.id, workOrders.responsablePrincipalUserId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, workOrders.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(workOrders)
      .leftJoin(locations, eq(locations.id, workOrders.locationId))
      .where(where),
  ]);

  const data = { rows: rows as OrdenRow[], total: totalRow[0]?.n ?? 0, page: query.page, pageSize: query.pageSize };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Órdenes de trabajo" descripcion="El módulo central de mantenimiento: planificación, ejecución y costos." />
      <div className="min-h-0 flex-1">
        <OrdenesView vista="lista" data={data} kanbanRows={[]} sort={query.sort} filters={query.filters} search={query.search} puedeCrear={hasPermission(session, 'ordenes.crear')} />
      </div>
    </div>
  );
}
