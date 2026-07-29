import { headers } from 'next/headers';
import { db, type DbTx } from '@/db';
import { auditLog } from '@/db/schema';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT';
export type AuditLevel = 'INFO' | 'CRITICO';

export type AuditDiff = Record<string, { antes: unknown; despues: unknown }>;

export type AuditInput = {
  tenantId: string;
  entidad: string;
  entidadId?: string | null;
  accion: AuditAction;
  nivel?: AuditLevel;
  permiso?: string | null;
  diff?: AuditDiff | null;
  userId?: string | null;
  userEmail?: string | null;
  /** Pásalo cuando la escritura deba viajar dentro de una transacción abierta. */
  tx?: DbTx | Parameters<Parameters<DbTx['transaction']>[0]>[0];
};

async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    return {
      ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: h.get('user-agent'),
    };
  } catch {
    // Fuera de un request (cron, seed, tests): no hay cabeceras.
    return { ip: null, userAgent: null };
  }
}

/**
 * Escribe en la bitácora. Debe permitir responder
 * "quién cambió qué, cuándo y desde dónde" para cualquier registro (§8).
 *
 * Nunca lanza: un fallo de auditoría no puede tumbar la operación de negocio,
 * pero sí se reporta por consola para que Sentry lo capture.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    const { ip, userAgent } = await requestMeta();
    const client = input.tx ?? db;
    await client.insert(auditLog).values({
      tenantId: input.tenantId,
      entidad: input.entidad,
      entidadId: input.entidadId ?? null,
      accion: input.accion,
      nivel: input.nivel ?? 'INFO',
      permiso: input.permiso ?? null,
      diff: input.diff ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error('[audit] no se pudo escribir la bitácora', error);
  }
}

/** Calcula el diff entre dos versiones de un registro, ignorando columnas de auditoría. */
export function buildDiff<T extends Record<string, unknown>>(antes: T | null, despues: T | null): AuditDiff {
  const IGNORAR = new Set(['createdAt', 'createdBy', 'updatedAt', 'updatedBy']);
  const diff: AuditDiff = {};
  const claves = new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})]);
  for (const clave of claves) {
    if (IGNORAR.has(clave)) continue;
    const a = antes?.[clave] ?? null;
    const d = despues?.[clave] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(d)) diff[clave] = { antes: a, despues: d };
  }
  return diff;
}
