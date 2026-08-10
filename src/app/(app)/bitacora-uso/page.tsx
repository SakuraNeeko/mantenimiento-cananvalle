import type { Metadata } from 'next';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assetUsageLogs, assets, users } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
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

export default async function BitacoraUsoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission('bitacora.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'bitacora');
  const query = parseTableQuery(await searchParams);

  const where = and(
    eq(assetUsageLogs.tenantId, tenant.id),
    isNull(assetUsageLogs.deletedAt),
    buildWhere(COLUMNAS, query.filters, query.search, ['proposito']),
  );
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: assetUsageLogs.id,
        assetCodigo: assets.codigo,
        assetNombre: assets.nombre,
        responsableNombre: users.nombre,
        proposito: assetUsageLogs.proposito,
        estado: assetUsageLogs.estado,
        fechaSalida: assetUsageLogs.fechaSalida,
        fechaRegreso: assetUsageLogs.fechaRegreso,
      })
      .from(assetUsageLogs)
      .innerJoin(assets, eq(assets.id, assetUsageLogs.assetId))
      .leftJoin(users, eq(users.id, assetUsageLogs.responsableUserId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, assetUsageLogs.fechaSalida))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(assetUsageLogs)
      .innerJoin(assets, eq(assets.id, assetUsageLogs.assetId))
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
