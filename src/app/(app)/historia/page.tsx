import type { Metadata } from 'next';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { woHistory } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { HistoriaTable } from './historia-table';
import type { HistoriaRow } from './columns';

export const metadata: Metadata = { title: 'Historia' };

const COLUMNAS = {
  consecutivo: woHistory.consecutivo,
  assetNombre: woHistory.assetNombre,
  origen: woHistory.origen,
  fechaFinReal: woHistory.fechaFinReal,
  costoTotal: woHistory.costoTotal,
};

export default async function HistoriaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission('historia.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);

  const where = and(eq(woHistory.tenantId, tenant.id), buildWhere(COLUMNAS, query.filters, query.search, ['consecutivo', 'assetNombre']));
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
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
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, woHistory.fechaFinReal))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(woHistory).where(where),
  ]);

  const data = { rows: rows as HistoriaRow[], total: totalRow[0]?.n ?? 0, page: query.page, pageSize: query.pageSize };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Historia" descripcion="Copia inmutable de las órdenes de trabajo cerradas — la hoja de vida de cada activo." />
      <div className="min-h-0 flex-1">
        <HistoriaTable data={data} sort={query.sort} filters={query.filters} search={query.search} puedeEnviar={hasPermission(session, 'historia.enviar')} puedeArchivar={hasPermission(session, 'historia.archivar')} />
      </div>
    </div>
  );
}
