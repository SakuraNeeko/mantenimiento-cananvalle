import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { apiKeys, apiKeyUsage } from '@/db/schema';

/** Scopes deliberadamente más chicos que el catálogo de 97 permisos internos — una integración externa no necesita todo lo que puede un usuario logueado. */
export const ALCANCES_API = ['activos.leer', 'ordenes.leer', 'ordenes.crear', 'solicitudes.crear'] as const;
export type AlcanceApi = (typeof ALCANCES_API)[number];

const LIMITE_POR_MINUTO = 60;

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** Genera una clave nueva en texto plano (se muestra una única vez) y su hash/prefijo para guardar. */
export function generarApiKey(): { keyEnClaro: string; hash: string; prefijo: string } {
  const cuerpo = randomBytes(24).toString('hex');
  const keyEnClaro = `gmao_live_${cuerpo}`;
  return { keyEnClaro, hash: hashKey(keyEnClaro), prefijo: keyEnClaro.slice(0, 14) };
}

export type ContextoApiKey = { tenantId: string; apiKeyId: string; alcance: AlcanceApi[]; creadaPor: string | null };

/** Autentica una request de la API pública contra el header `Authorization: Bearer <key>`. */
export async function autenticarApiKey(request: Request): Promise<ContextoApiKey | { error: string; status: number }> {
  const auth = request.headers.get('authorization');
  const key = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!key) return { error: 'Falta el encabezado Authorization: Bearer <api key>.', status: 401 };

  const hash = hashKey(key);
  const [fila] = await db
    .select({ id: apiKeys.id, tenantId: apiKeys.tenantId, alcance: apiKeys.permisos, expiraAt: apiKeys.expiraAt, revocadaAt: apiKeys.revocadaAt, creadaPor: apiKeys.createdBy })
    .from(apiKeys)
    .where(and(eq(apiKeys.hash, hash), isNull(apiKeys.revocadaAt), or(isNull(apiKeys.expiraAt), gt(apiKeys.expiraAt, new Date()))))
    .limit(1);

  if (!fila) return { error: 'API key inválida, revocada o expirada.', status: 401 };

  const desde = new Date(Date.now() - 60_000);
  const [conteo] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(apiKeyUsage)
    .where(and(eq(apiKeyUsage.apiKeyId, fila.id), gt(apiKeyUsage.createdAt, desde)));
  if ((conteo?.n ?? 0) >= LIMITE_POR_MINUTO) return { error: 'Límite de tasa excedido (60 solicitudes por minuto).', status: 429 };

  return { tenantId: fila.tenantId, apiKeyId: fila.id, alcance: (fila.alcance as AlcanceApi[]) ?? [], creadaPor: fila.creadaPor };
}

export function tieneAlcance(contexto: ContextoApiKey, alcance: AlcanceApi): boolean {
  return contexto.alcance.includes(alcance);
}

/**
 * Bitácora de uso (§8: "con alcance de permisos y bitácora de uso"). Se
 * llama al final de cada handler, éxito o error. `api_keys` no tiene una
 * columna de "último uso" propia — se deriva de `MAX(created_at)` en
 * `api_key_usage`, que ya guarda cada llamada; una segunda columna
 * redundante solo sería una fuente más de la que olvidarse de mantener
 * sincronizada.
 */
export async function registrarUsoApiKey(apiKeyId: string, endpoint: string, metodo: string, statusCode: number, ip: string | null): Promise<void> {
  await db.insert(apiKeyUsage).values({ apiKeyId, endpoint, metodo, statusCode, ip });
}
