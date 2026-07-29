import type { Metadata } from 'next';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, downtimes, locations, users } from '@/db/schema';
import { hasPermission, requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { ParosTable } from './paros-table';
import type { ParoRow } from './columns';

export const metadata: Metadata = { title: 'Paros y averías' };

const COLUMNAS = {
  consecutivo: downtimes.consecutivo,
  tipo: downtimes.tipo,
  estado: downtimes.estado,
  fechaInicio: downtimes.fechaInicio,
};

export default async function ParosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission('paros.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);
  const { scope, userId, siteIds } = scopeDescriptor(session);

  const alcance =
    scope === 'TENANT'
      ? undefined
      : scope === 'SEDE'
        ? or(siteIds.length > 0 ? inArray(locations.siteId, siteIds) : undefined, eq(downtimes.responsableReporteUserId, userId))
        : eq(downtimes.responsableReporteUserId, userId);

  const where = and(eq(downtimes.tenantId, tenant.id), alcance, buildWhere(COLUMNAS, query.filters, query.search, ['consecutivo']));
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: downtimes.id,
        consecutivo: downtimes.consecutivo,
        assetCodigo: assets.codigo,
        assetNombre: assets.nombre,
        tipo: downtimes.tipo,
        estado: downtimes.estado,
        fechaInicio: downtimes.fechaInicio,
        fechaFin: downtimes.fechaFin,
        duracionMinutos: downtimes.duracionMinutos,
        responsableNombre: users.nombre,
      })
      .from(downtimes)
      .innerJoin(assets, eq(assets.id, downtimes.assetId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .leftJoin(users, eq(users.id, downtimes.responsableReporteUserId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, downtimes.fechaInicio))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(downtimes)
      .innerJoin(assets, eq(assets.id, downtimes.assetId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .where(where),
  ]);

  const data = { rows: rows as ParoRow[], total: totalRow[0]?.n ?? 0, page: query.page, pageSize: query.pageSize };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Paros y averías" descripcion="Detenciones programadas y no programadas, base del MTBF/MTTR." />
      <div className="min-h-0 flex-1">
        <ParosTable data={data} sort={query.sort} filters={query.filters} search={query.search} puedeRegistrar={hasPermission(session, 'paros.registrar')} />
      </div>
    </div>
  );
}
