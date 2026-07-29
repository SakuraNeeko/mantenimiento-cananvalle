import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tenantModules } from '@/db/schema';

/**
 * Módulos opcionales, activables por tenant (§4.11): `tenant_modules` ya
 * existe desde la Fase 1 y alimenta `visibleNav()` en el layout, pero eso
 * solo oculta el enlace del menú — una URL directa sigue siendo accesible
 * si no se valida también aquí, en el propio Server Component de la página.
 */
export async function moduloHabilitado(tenantId: string, modulo: string): Promise<boolean> {
  const [fila] = await db
    .select({ habilitado: tenantModules.habilitado })
    .from(tenantModules)
    .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.modulo, modulo)))
    .limit(1);
  return fila?.habilitado ?? false;
}

/** Para usar al inicio de una page.tsx: `await requireModulo(tenant.id, 'combustibles');` — igual que `notFound()` en cualquier otra ficha. */
export async function requireModulo(tenantId: string, modulo: string): Promise<void> {
  if (!(await moduloHabilitado(tenantId, modulo))) {
    notFound();
  }
}
