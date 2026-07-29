import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePool } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL');
}

/**
 * Conexión HTTP: una sola ida y vuelta por consulta, apta para edge.
 * Úsala para TODAS las lecturas y para escrituras de una sola sentencia.
 */
export const db = drizzleHttp(neon(connectionString), { schema, casing: 'snake_case' });

/**
 * Pool WebSocket: la ÚNICA que soporta transacciones reales.
 * Obligatoria en: movimientos de kárdex, cierre/liquidación de OT y
 * generación masiva de OT (regla técnica §2 del prompt maestro).
 */
const pool = new Pool({ connectionString });
export const dbTx = drizzlePool(pool, { schema, casing: 'snake_case' });

export { schema };
export type Db = typeof db;
export type DbTx = typeof dbTx;
