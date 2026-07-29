import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';
import { isSensitive, type PermissionCode } from './catalog';
import { writeAudit } from '@/lib/audit';

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN';
  constructor(public readonly permiso: string) {
    super(`No tienes el permiso requerido: ${permiso}`);
  }
}

export class UnauthorizedError extends Error {
  readonly code = 'UNAUTHORIZED';
  constructor() {
    super('Debes iniciar sesión.');
  }
}

export function hasPermission(session: Session | null, permiso: PermissionCode): boolean {
  return Boolean(session?.user?.permissions?.includes(permiso));
}

export function hasAny(session: Session | null, permisos: PermissionCode[]): boolean {
  return permisos.some((p) => hasPermission(session, p));
}

/**
 * Guardián obligatorio del servidor.
 *
 * Ocultar un botón en la UI NO es un control de seguridad (§8): toda Server
 * Action y toda ruta de API empieza llamando a esta función.
 *
 * Segundo control — alcance de datos:
 *   PROPIO  → solo registros donde el usuario es responsable/solicitante
 *   SEDE    → registros de las sedes en `user_site_access`
 *   TENANT  → toda la empresa
 * El filtro concreto lo aplica cada servicio con `scopeFilter()`.
 */
export async function requirePermission(permiso: PermissionCode): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();

  if (!session.user.permissions.includes(permiso)) {
    await writeAudit({
      tenantId: session.user.tenantId,
      entidad: 'seguridad',
      accion: 'UPDATE',
      nivel: 'CRITICO',
      permiso,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: { intentoDenegado: { antes: null, despues: permiso } },
    });
    throw new ForbiddenError(permiso);
  }

  if (isSensitive(permiso)) {
    await writeAudit({
      tenantId: session.user.tenantId,
      entidad: 'seguridad',
      accion: 'UPDATE',
      nivel: 'CRITICO',
      permiso,
      userId: session.user.id,
      userEmail: session.user.email ?? null,
      diff: { permisoSensibleEjercido: { antes: null, despues: permiso } },
    });
  }

  return session;
}

/** Verifica que el registro pertenezca a una sede accesible por el usuario. */
export function assertSiteAccess(session: Session, siteId: string | null): void {
  if (session.user.scope === 'TENANT') return;
  if (!siteId) return;
  if (!session.user.siteIds.includes(siteId)) {
    throw new ForbiddenError('acceso.sede');
  }
}

/**
 * Devuelve la restricción de alcance que el servicio debe aplicar al WHERE.
 * `ownerColumn` es la columna que identifica al "dueño" del registro
 * (responsable de la OT, solicitante de la SS, etc.).
 */
export function scopeDescriptor(session: Session): { scope: 'PROPIO' | 'SEDE' | 'TENANT'; userId: string; siteIds: string[] } {
  return {
    scope: session.user.scope,
    userId: session.user.id,
    siteIds: session.user.siteIds,
  };
}
