import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { getCatalogo } from '@/lib/catalogs/registry';
import { columnasBase } from '@/lib/catalogs/db-helpers';
import { CatalogoTable, type RegistroRow } from './catalogo-table';
import { ArbolCatalogo } from './arbol-catalogo';
import { obtenerOpciones } from './actions';

export async function generateMetadata({ params }: { params: Promise<{ catalogo: string }> }): Promise<Metadata> {
  const { catalogo } = await params;
  return { title: getCatalogo(catalogo)?.titulo ?? 'Catálogo' };
}

export default async function CatalogoPage({
  params,
  searchParams,
}: {
  params: Promise<{ catalogo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { catalogo } = await params;
  const def = getCatalogo(catalogo);
  if (!def) notFound();

  const session = await requirePermission('infra.catalogos.ver');
  const tenant = await getCurrentTenant();
  const cols = columnasBase(def);

  const puedeCrear = hasPermission(session, 'infra.catalogos.crear');
  const puedeEditar = hasPermission(session, 'infra.catalogos.editar');
  const puedeEliminar = hasPermission(session, 'infra.catalogos.eliminar');
  const puedeExportar = hasPermission(session, 'infra.exportar');
  const puedeImportar = hasPermission(session, 'infra.importar');

  if (def.jerarquico) {
    const filas = await db
      .select()
      .from(def.tabla)
      .where(and(eq(cols.tenantId, tenant.id), isNull(cols.deletedAt)));

    return (
      <div className="flex h-full flex-col gap-3">
        <PageHeader titulo={def.titulo} descripcion={def.descripcion} />
        <div className="min-h-0 flex-1">
          <ArbolCatalogo
            slug={catalogo}
            def={def}
            filas={filas as unknown as RegistroRow[]}
            puedeCrear={puedeCrear}
            puedeEditar={puedeEditar}
            puedeEliminar={puedeEliminar}
          />
        </div>
      </div>
    );
  }

  const query = parseTableQuery(await searchParams);
  const where = and(
    eq(cols.tenantId, tenant.id),
    isNull(cols.deletedAt),
    buildWhere(def.columnas, query.filters, query.search, ['codigo', 'nombre']),
  );
  const { limit, offset } = buildLimitOffset(query);
  const ordenPorDefecto = def.columnas.nombre ?? cols.id;

  const [rows, totalRow, opciones] = await Promise.all([
    db
      .select()
      .from(def.tabla)
      .where(where)
      .orderBy(...buildOrderBy(def.columnas, query.sort, ordenPorDefecto))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(def.tabla).where(where),
    obtenerOpciones(catalogo),
  ]);

  const data = {
    rows: rows as unknown as RegistroRow[],
    total: totalRow[0]?.n ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo={def.titulo} descripcion={def.descripcion} />
      <div className="min-h-0 flex-1">
        <CatalogoTable
          slug={catalogo}
          def={def}
          data={data}
          sort={query.sort}
          filters={query.filters}
          search={query.search}
          opciones={opciones}
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          puedeExportar={puedeExportar}
          puedeImportar={puedeImportar}
        />
      </div>
    </div>
  );
}
