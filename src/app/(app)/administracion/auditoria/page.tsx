import type { Metadata } from 'next';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { auditLog } from '@/db/schema';
import { requirePermission } from '@/lib/permissions';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { AuditoriaTable } from './auditoria-table';
import type { AuditoriaRow } from './columns';

export const metadata: Metadata = { title: 'Auditoría' };

const COLUMNAS = {
  entidad: auditLog.entidad,
  accion: auditLog.accion,
  nivel: auditLog.nivel,
  permiso: auditLog.permiso,
  userEmail: auditLog.userEmail,
  ip: auditLog.ip,
  createdAt: auditLog.createdAt,
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission('admin.auditoria.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);

  const where = and(
    eq(auditLog.tenantId, tenant.id),
    buildWhere(COLUMNAS, query.filters, query.search, ['entidad', 'permiso', 'userEmail']),
  );

  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        entidad: auditLog.entidad,
        entidadId: auditLog.entidadId,
        accion: auditLog.accion,
        nivel: auditLog.nivel,
        permiso: auditLog.permiso,
        userEmail: auditLog.userEmail,
        ip: auditLog.ip,
        diff: auditLog.diff,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort.length > 0 ? query.sort : [{ id: 'createdAt', desc: true }]))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(auditLog).where(where),
  ]);

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader
        titulo="Auditoría"
        descripcion="Quién cambió qué, cuándo y desde dónde. Los registros no se editan ni se eliminan."
      />
      <div className="min-h-0 flex-1">
        <AuditoriaTable
          data={{ rows: rows as AuditoriaRow[], total: totalRow[0]?.n ?? 0, page: query.page, pageSize: query.pageSize }}
          sort={query.sort}
          filters={query.filters}
          search={query.search}
        />
      </div>
    </div>
  );
}
