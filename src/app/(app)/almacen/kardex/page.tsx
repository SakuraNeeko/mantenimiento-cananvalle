import type { Metadata } from 'next';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { kardexConcepts, kardexMovements, parties, warehouses } from '@/db/schema';
import { hasAny, requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { KardexTable } from './kardex-table';
import type { MovimientoRow } from './columns';

export const metadata: Metadata = { title: 'Kárdex' };

const COLUMNAS = {
  consecutivo: kardexMovements.consecutivo,
  fecha: kardexMovements.fecha,
  estado: kardexMovements.estado,
};

export default async function KardexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission('almacen.kardex.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);
  const { scope, siteIds } = scopeDescriptor(session);

  // Sin alcance TENANT, un movimiento solo se ve si el almacén pertenece a una sede asignada al usuario.
  const alcance = scope === 'TENANT' ? undefined : inArray(warehouses.siteId, siteIds.length > 0 ? siteIds : ['—']);

  const where = and(eq(kardexMovements.tenantId, tenant.id), alcance, buildWhere(COLUMNAS, query.filters, query.search, ['consecutivo', 'documentoSoporte']));
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: kardexMovements.id,
        consecutivo: kardexMovements.consecutivo,
        fecha: kardexMovements.fecha,
        estado: kardexMovements.estado,
        conceptoNombre: kardexConcepts.nombre,
        signo: kardexConcepts.signo,
        warehouseNombre: warehouses.nombre,
        partyNombre: parties.nombre,
      })
      .from(kardexMovements)
      .innerJoin(kardexConcepts, eq(kardexConcepts.id, kardexMovements.kardexConceptId))
      .innerJoin(warehouses, eq(warehouses.id, kardexMovements.warehouseId))
      .leftJoin(parties, eq(parties.id, kardexMovements.partyId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, kardexMovements.fecha))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(kardexMovements).innerJoin(warehouses, eq(warehouses.id, kardexMovements.warehouseId)).where(where),
  ]);

  const data = {
    rows: rows as MovimientoRow[],
    total: totalRow[0]?.n ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Kárdex" descripcion="Movimientos de entrada, salida y ajuste de existencias." />
      <div className="min-h-0 flex-1">
        <KardexTable data={data} sort={query.sort} filters={query.filters} search={query.search} puedeCrear={hasAny(session, ['almacen.kardex.entrada', 'almacen.kardex.salida'])} />
      </div>
    </div>
  );
}
