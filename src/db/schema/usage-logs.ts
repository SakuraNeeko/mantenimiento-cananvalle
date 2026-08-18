import { sql } from 'drizzle-orm';
import { index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from './_shared';
import { usageLogEstadoEnum } from './enums';
import { sites, tenants } from './core';
import { catalogColumns, responsibles } from './infra';
import { assets } from './assets';

/**
 * Destinos frecuentes de la Bitácora de uso (ej. "Taller mecánico X", "Banco"):
 * lista curada por un admin/gerente (vía el catálogo genérico de Infraestructura)
 * que alimenta el selector de Destino del chofer como atajo — al elegir uno se
 * guarda igual que "Otro" (texto libre en `destinoOtro`), sin requerir una FK
 * propia ni tocar la lógica de alcance por sede que sí aplica a `sites`.
 */
export const bitacoraDestinos = pgTable(
  'bitacora_destinos',
  { ...catalogColumns },
  (t) => [
    uniqueIndex('bitacora_destinos_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('bitacora_destinos_tenant_idx').on(t.tenantId),
  ],
);

/**
 * Módulo BITÁCORA DE USO (opcional) — control de quién usa un vehículo o
 * equipo, para qué y con qué estado (foto de salida y de regreso). Cada uso
 * abre un registro al sacar el activo y se cierra al devolverlo, igual que
 * un paro (`downtimes`): sin borrador, se registra ya "ocurrido".
 */
export const assetUsageLogs = pgTable(
  'asset_usage_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    /** Quién usa el activo: un registro del catálogo Responsables, no necesariamente un usuario del sistema. */
    responsableId: uuid('responsable_id')
      .notNull()
      .references(() => responsibles.id, { onDelete: 'restrict' }),
    /** Nullable a nivel de BD por compatibilidad con registros creados antes de este campo; el formulario lo exige. */
    origenSiteId: uuid('origen_site_id').references(() => sites.id, { onDelete: 'set null' }),
    /** Uno de los dos: una sede real, o `destinoOtro` cuando el destino no es ninguna finca del sistema. */
    destinoSiteId: uuid('destino_site_id').references(() => sites.id, { onDelete: 'set null' }),
    destinoOtro: text('destino_otro'),
    /** Mismo criterio que destino: una sede real, o `llegadaOtro` cuando el lugar de llegada no es ninguna finca del sistema. */
    llegadaSiteId: uuid('llegada_site_id').references(() => sites.id, { onDelete: 'set null' }),
    llegadaOtro: text('llegada_otro'),
    proposito: text('proposito').notNull(),
    estado: usageLogEstadoEnum('estado').notNull().default('ABIERTO'),
    fechaSalida: timestamp('fecha_salida', { withTimezone: true }).notNull().defaultNow(),
    lecturaSalida: numeric('lectura_salida', { precision: 18, scale: 4 }),
    fotoSalidaUrl: text('foto_salida_url'),
    fechaRegreso: timestamp('fecha_regreso', { withTimezone: true }),
    lecturaRegreso: numeric('lectura_regreso', { precision: 18, scale: 4 }),
    fotoRegresoUrl: text('foto_regreso_url'),
    observaciones: text('observaciones'),
    ...auditColumns,
  },
  (t) => [
    index('asset_usage_logs_tenant_idx').on(t.tenantId, t.assetId, t.fechaSalida),
    index('asset_usage_logs_estado_idx').on(t.tenantId, t.estado),
  ],
);

export type AssetUsageLog = typeof assetUsageLogs.$inferSelect;
export type NewAssetUsageLog = typeof assetUsageLogs.$inferInsert;
