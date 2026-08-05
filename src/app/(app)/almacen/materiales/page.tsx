import type { Metadata } from 'next';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { materials, warehouseStock } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { MaterialesTable } from './materiales-table';
import type { MaterialRow } from './columns';

export const metadata: Metadata = { title: 'Materiales' };

const COLUMNAS = {
  codigo: materials.codigo,
  nombre: materials.nombre,
  tipo: materials.tipo,
  categoria: materials.categoria,
  critico: materials.critico,
  activo: materials.activo,
};

export default async function MaterialesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission('almacen.materiales.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);

  const where = and(
    eq(materials.tenantId, tenant.id),
    isNull(materials.deletedAt),
    buildWhere(COLUMNAS, query.filters, query.search, ['codigo', 'nombre', 'categoria']),
  );
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({ id: materials.id, codigo: materials.codigo, nombre: materials.nombre, tipo: materials.tipo, categoria: materials.categoria, critico: materials.critico, activo: materials.activo })
      .from(materials)
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, materials.nombre))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(materials).where(where),
  ]);

  const ids = rows.map((r) => r.id);
  const bajoMinimoIds =
    ids.length > 0
      ? new Set(
          (
            await db
              .select({ materialId: warehouseStock.materialId })
              .from(warehouseStock)
              .where(and(inArray(warehouseStock.materialId, ids), sql`${warehouseStock.minimo} is not null`, sql`${warehouseStock.cantidad} < ${warehouseStock.minimo}`))
          ).map((r) => r.materialId),
        )
      : new Set<string>();

  const data = {
    rows: rows.map((r) => ({ ...r, bajoMinimo: bajoMinimoIds.has(r.id) })) as MaterialRow[],
    total: totalRow[0]?.n ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Materiales" descripcion="Repuestos, insumos, herramientas y EPP controlados por kárdex." />
      <div className="min-h-0 flex-1">
        <MaterialesTable
          data={data}
          sort={query.sort}
          filters={query.filters}
          search={query.search}
          puedeGestionar={hasPermission(session, 'almacen.materiales.gestionar')}
          puedeExportar={hasPermission(session, 'almacen.materiales.exportar')}
          puedeImportar={hasPermission(session, 'almacen.materiales.importar')}
        />
      </div>
    </div>
  );
}
