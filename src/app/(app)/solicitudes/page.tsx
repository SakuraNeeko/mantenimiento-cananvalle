import type { Metadata } from 'next';
import { alias } from 'drizzle-orm/pg-core';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { serviceRequests, users } from '@/db/schema';
import { hasPermission, requirePermission, scopeDescriptor } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { SolicitudesTable } from './solicitudes-table';
import type { SolicitudRow } from './columns';

export const metadata: Metadata = { title: 'Solicitudes' };

const solicitantes = alias(users, 'solicitantes');
const responsables = alias(users, 'responsables');

const COLUMNAS = {
  consecutivo: serviceRequests.consecutivo,
  descripcion: serviceRequests.descripcion,
  prioridad: serviceRequests.prioridad,
  estado: serviceRequests.estado,
  fecha: serviceRequests.fecha,
};

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission('solicitudes.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);
  const { scope, userId, siteIds } = scopeDescriptor(session);

  const alcance =
    scope === 'TENANT'
      ? undefined
      : scope === 'SEDE'
        ? or(
            siteIds.length > 0 ? inArray(serviceRequests.siteId, siteIds) : undefined,
            eq(serviceRequests.solicitanteUserId, userId),
            eq(serviceRequests.responsableUserId, userId),
          )
        : or(eq(serviceRequests.solicitanteUserId, userId), eq(serviceRequests.responsableUserId, userId));

  const where = and(
    eq(serviceRequests.tenantId, tenant.id),
    alcance,
    buildWhere(COLUMNAS, query.filters, query.search, ['consecutivo', 'descripcion']),
  );
  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: serviceRequests.id,
        consecutivo: serviceRequests.consecutivo,
        fecha: serviceRequests.fecha,
        descripcion: serviceRequests.descripcion,
        prioridad: serviceRequests.prioridad,
        estado: serviceRequests.estado,
        solicitanteNombre: solicitantes.nombre,
        responsableNombre: responsables.nombre,
      })
      .from(serviceRequests)
      .innerJoin(solicitantes, eq(solicitantes.id, serviceRequests.solicitanteUserId))
      .leftJoin(responsables, eq(responsables.id, serviceRequests.responsableUserId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, serviceRequests.fecha))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(serviceRequests).where(where),
  ]);

  const data = {
    rows: rows as SolicitudRow[],
    total: totalRow[0]?.n ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Solicitudes" descripcion="Fallas y trabajos reportados, desde el borrador hasta el cierre." />
      <div className="min-h-0 flex-1">
        <SolicitudesTable data={data} sort={query.sort} filters={query.filters} search={query.search} puedeCrear={hasPermission(session, 'solicitudes.crear')} />
      </div>
    </div>
  );
}
