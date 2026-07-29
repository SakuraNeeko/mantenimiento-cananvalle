import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { tenants, type Tenant } from '@/db/schema';

/**
 * Instancia única (respuesta P-01): existe UN solo tenant.
 * Se cachea por request con `cache()` para no golpear la BD en cada componente.
 *
 * `tenant_id` sigue presente en el esquema para no cerrar la puerta a un
 * despliegue multi-empresa futuro, pero la app nunca lo recibe del cliente.
 */
export const getCurrentTenant = cache(async (): Promise<Tenant> => {
  const codigo = process.env.COMPANY_CODE ?? 'EMPRESA';
  const [row] = await db.select().from(tenants).where(eq(tenants.codigo, codigo)).limit(1);
  if (!row) {
    throw new Error(
      `No existe el tenant "${codigo}". Ejecuta "pnpm db:seed" o ajusta COMPANY_CODE.`,
    );
  }
  return row;
});

/**
 * Helper central de scoping. TODA consulta de negocio pasa por aquí:
 *   const rows = await db.select().from(assets).where(withTenant(assets, session));
 * Nunca se confía en un tenant_id que llegue del cliente.
 */
export function tenantIdOf(session: { user: { tenantId: string } }): string {
  return session.user.tenantId;
}
