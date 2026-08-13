import type { Metadata } from 'next';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { roles, sites, users } from '@/db/schema';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { ROLES_PROTEGIDOS, type RoleCode } from '@/lib/permissions/catalog';
import { esAdmin } from '@/lib/permissions/roles-protegidos';
import { getCurrentTenant } from '@/lib/tenant';
import { buildLimitOffset, buildOrderBy, buildWhere } from '@/lib/query-builder';
import { parseTableQuery } from '@/components/data-table/types';
import { PageHeader } from '@/components/layout/page-header';
import { UsuariosTable } from './usuarios-table';
import type { UsuarioRow } from './columns';

export const metadata: Metadata = { title: 'Usuarios' };

/** Columnas expuestas al constructor de filtros. Un id ajeno a este mapa se ignora. */
const COLUMNAS = {
  nombre: users.nombre,
  email: users.email,
  cargo: users.cargo,
  activo: users.activo,
  lastLoginAt: users.lastLoginAt,
};

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission('admin.usuarios.ver');
  const tenant = await getCurrentTenant();
  const query = parseTableQuery(await searchParams);

  const where = and(
    eq(users.tenantId, tenant.id),
    sql`${users.deletedAt} is null`,
    buildWhere(COLUMNAS, query.filters, query.search, ['nombre', 'email', 'cargo']),
  );

  const { limit, offset } = buildLimitOffset(query);

  const [rows, totalRow, rolesDb, sitesDb] = await Promise.all([
    db
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
        cargo: users.cargo,
        sede: sites.nombre,
        activo: users.activo,
        lastLoginAt: users.lastLoginAt,
        roles: sql<string>`(
          select string_agg(r.nombre, ', ' order by r.codigo)
          from user_roles ur join roles r on r.id = ur.role_id
          where ur.user_id = ${users.id}
        )`,
        rolesCodigos: sql<string>`(
          select string_agg(r.codigo, ',' order by r.codigo)
          from user_roles ur join roles r on r.id = ur.role_id
          where ur.user_id = ${users.id}
        )`,
      })
      .from(users)
      .leftJoin(sites, eq(sites.id, users.siteDefaultId))
      .where(where)
      .orderBy(...buildOrderBy(COLUMNAS, query.sort, users.nombre))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(where),
    db
      .select({ id: roles.id, codigo: roles.codigo, nombre: roles.nombre })
      .from(roles)
      .where(and(eq(roles.tenantId, tenant.id), eq(roles.activo, true), isNull(roles.deletedAt)))
      .orderBy(roles.codigo),
    db
      .select({ id: sites.id, nombre: sites.nombre })
      .from(sites)
      .where(and(eq(sites.tenantId, tenant.id), eq(sites.activo, true), isNull(sites.deletedAt)))
      .orderBy(sites.nombre),
  ]);

  const data = {
    rows: rows as UsuarioRow[],
    total: totalRow[0]?.n ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };

  const puedeGestionarProtegidos = esAdmin(session);
  // Un Gerente puede crear/editar usuarios, pero nunca asignar el rol ADMIN o GERENTE (§8: se
  // refuerza también en el servidor, esto solo evita que el checkbox exista en el formulario).
  const rolesAsignables = puedeGestionarProtegidos ? rolesDb : rolesDb.filter((r) => !ROLES_PROTEGIDOS.includes(r.codigo as RoleCode));

  return (
    <div className="flex h-full flex-col gap-3">
      <PageHeader titulo="Usuarios" descripcion="Personas con acceso al sistema y los roles que tienen asignados." />
      <div className="min-h-0 flex-1">
        <UsuariosTable
          data={data}
          sort={query.sort}
          filters={query.filters}
          search={query.search}
          roles={rolesAsignables}
          sites={sitesDb}
          puedeGestionar={hasPermission(session, 'admin.usuarios.gestionar')}
          puedeGestionarProtegidos={puedeGestionarProtegidos}
        />
      </div>
    </div>
  );
}
