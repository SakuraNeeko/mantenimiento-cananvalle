import type { Metadata } from 'next';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { adverseEvents, assets, locations } from '@/db/schema';
import { hasPermission, requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { requireModulo } from '@/lib/tenant/modules';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { EventosTable } from './eventos-table';
import type { EventoRow } from './columns';

export const metadata: Metadata = { title: 'Tecnovigilancia' };

const COLUMNAS = {
  tipo: adverseEvents.tipo,
  severidad: adverseEvents.severidad,
  estado: adverseEvents.estado,
  fecha: adverseEvents.fecha,
};

export default async function TecnovigilanciaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission('tecnovigilancia.ver');
  const tenant = await getCurrentTenant();
  await requireModulo(tenant.id, 'tecnovigilancia');
  const query = parseTableQuery(await searchParams);
  const { scope, siteIds } = scopeDescriptor(session);

  // Sin alcance TENANT, un evento solo se ve si la ubicación de su activo pertenece a una sede asignada al usuario.
  const alcance = scope === 'TENANT' ? undefined : inArray(locations.siteId, siteIds.length > 0 ? siteIds : ['—']);

  const where = and(eq(adverseEvents.tenantId, tenant.id), alcance, buildWhere(COLUMNAS, query.filters, query.search, ['descripcion']));
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: adverseEvents.id,
        assetCodigo: assets.codigo,
        assetNombre: assets.nombre,
        tipo: adverseEvents.tipo,
        severidad: adverseEvents.severidad,
        estado: adverseEvents.estado,
        fecha: adverseEvents.fecha,
        reportadoAutoridad: adverseEvents.reportadoAutoridad,
      })
      .from(adverseEvents)
      .innerJoin(assets, eq(assets.id, adverseEvents.assetId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, adverseEvents.fecha))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(adverseEvents)
      .innerJoin(assets, eq(assets.id, adverseEvents.assetId))
      .leftJoin(locations, eq(locations.id, assets.locationId))
      .where(where),
  ]);

  const data = { rows: rows as EventoRow[], total: totalRow[0]?.n ?? 0, page: query.page, pageSize: query.pageSize };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Tecnovigilancia" descripcion="Eventos adversos, incidentes y alertas de fabricante para equipos biomédicos." />
      <div className="min-h-0 flex-1">
        <EventosTable data={data} sort={query.sort} filters={query.filters} search={query.search} puedeRegistrar={hasPermission(session, 'tecnovigilancia.registrar')} />
      </div>
    </div>
  );
}
