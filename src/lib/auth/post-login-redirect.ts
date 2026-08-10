import type { Session } from 'next-auth';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tenantModules } from '@/db/schema';
import { visibleNav } from '@/components/layout/nav-config';

/**
 * `/dashboard` exige `reportes.dashboard.ver` — un rol sin ese permiso (ej.
 * Guardia, que solo tiene la Bitácora de uso) rompería con un error genérico
 * justo después de iniciar sesión si redirigimos ahí a ciegas. En vez de
 * eso, se manda a la primera pantalla que el menú ya le muestra.
 */
export async function primeraRutaVisible(session: Session): Promise<string> {
  if (session.user.permissions.includes('reportes.dashboard.ver')) return '/dashboard';

  const modulos = await db
    .select({ modulo: tenantModules.modulo })
    .from(tenantModules)
    .where(and(eq(tenantModules.tenantId, session.user.tenantId), eq(tenantModules.habilitado, true)));

  const grupos = visibleNav(session.user.permissions, modulos.map((m) => m.modulo));
  return grupos[0]?.items[0]?.href ?? '/dashboard';
}
