import { sql } from 'drizzle-orm';
import type { DbTx } from '@/db';

export type DocumentKind = 'OT' | 'SS' | 'PA' | 'KX' | 'IF' | 'SC' | 'OC';

type TxClient = Parameters<Parameters<DbTx['transaction']>[0]>[0];

/**
 * Toma el siguiente consecutivo con máscara configurable.
 *
 * D-08: se bloquea la fila con SELECT ... FOR UPDATE dentro de la MISMA
 * transacción que inserta el documento. Si la transacción falla, el número
 * no se consume. Es el único punto de serialización del sistema.
 *
 * Máscara: {YYYY} → año, {YY} → año corto, {#…#} → contador con ceros.
 *   "OT-{YYYY}-{######}"  →  OT-2026-000451
 *
 * IMPORTANTE: llamar SIEMPRE dentro de `dbTx.transaction(...)`, nunca con `db`.
 */
export async function nextCode(tx: TxClient, tenantId: string, documento: DocumentKind): Promise<string> {
  const anioActual = new Date().getUTCFullYear();

  const locked = await tx.execute(sql`
    SELECT id, mascara, valor_actual, anio, reinicia_anual
    FROM sequences
    WHERE tenant_id = ${tenantId} AND documento = ${documento}
    FOR UPDATE
  `);

  const row = (locked.rows ?? locked)[0] as
    | { id: string; mascara: string; valor_actual: number; anio: number; reinicia_anual: boolean }
    | undefined;

  if (!row) {
    throw new Error(`No existe una secuencia configurada para el documento "${documento}".`);
  }

  const reinicia = row.reinicia_anual && row.anio !== anioActual;
  const siguiente = reinicia ? 1 : row.valor_actual + 1;
  const anio = reinicia ? anioActual : row.anio;

  await tx.execute(sql`
    UPDATE sequences
    SET valor_actual = ${siguiente}, anio = ${anio}, updated_at = now()
    WHERE id = ${row.id}
  `);

  return applyMask(row.mascara, siguiente, anio);
}

export function applyMask(mascara: string, valor: number, anio: number): string {
  return mascara
    .replace('{YYYY}', String(anio))
    .replace('{YY}', String(anio).slice(-2))
    .replace(/\{(#+)\}/g, (_m, hashes: string) => String(valor).padStart(hashes.length, '0'));
}
