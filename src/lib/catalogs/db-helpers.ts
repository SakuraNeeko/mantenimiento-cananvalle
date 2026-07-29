import type { PgColumn } from 'drizzle-orm/pg-core';
import type { CatalogoDef } from './registry';

/**
 * Helpers de acceso dinámico a columnas, compartidos entre las Server Actions
 * y la página del catálogo genérico. El catálogo solo se conoce en runtime
 * (viene del slug de la URL), así que el acceso por nombre es inevitable.
 */

export type ColumnasBase = { id: PgColumn; tenantId: PgColumn; activo: PgColumn; deletedAt: PgColumn };

/** Todo catálogo se construye sobre `catalogColumns` (src/db/schema/infra.ts): estas cuatro columnas siempre existen. */
export function columnasBase(def: CatalogoDef): ColumnasBase {
  const cols = def.tabla as unknown as Record<string, PgColumn | undefined>;
  return { id: cols.id!, tenantId: cols.tenantId!, activo: cols.activo!, deletedAt: cols.deletedAt! };
}

export function columnasDe(def: CatalogoDef): Record<string, PgColumn> {
  return def.tabla as unknown as Record<string, PgColumn>;
}

export function esViolacionDeUnicidad(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}
