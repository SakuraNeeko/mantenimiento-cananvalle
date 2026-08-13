import { eq, inArray } from 'drizzle-orm';
import type { Session } from 'next-auth';
import { db } from '@/db';
import { roles, userRoles } from '@/db/schema';
import { ROLES_PROTEGIDOS, type RoleCode } from './catalog';

/**
 * Segundo control de admin.usuarios.gestionar (§8: ocultar el botón no basta):
 * quien no es ADMIN puede crear/editar/desactivar/eliminar usuarios, pero nunca
 * asignar el rol ADMIN o GERENTE, ni tocar una cuenta que ya tenga alguno de esos roles.
 */
export function esAdmin(session: Session): boolean {
  return session.user.roles.includes('ADMIN');
}

export async function codigosDeRoles(roleIds: string[]): Promise<string[]> {
  if (roleIds.length === 0) return [];
  const filas = await db.select({ codigo: roles.codigo }).from(roles).where(inArray(roles.id, roleIds));
  return filas.map((f) => f.codigo);
}

export async function codigosDeRolesDeUsuario(userId: string): Promise<string[]> {
  const filas = await db
    .select({ codigo: roles.codigo })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  return filas.map((f) => f.codigo);
}

export function incluyeRolProtegido(codigos: string[]): boolean {
  return codigos.some((c) => ROLES_PROTEGIDOS.includes(c as RoleCode));
}
