import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from './_shared';
import { usageLogEstadoEnum } from './enums';
import { sites, tenants } from './core';
import { responsibles } from './infra';
import { assets } from './assets';

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
    /** A qué finca llegó al cerrar el uso — siempre una de las fincas del sistema (no admite "otro" como el destino de salida). */
    llegadaSiteId: uuid('llegada_site_id').references(() => sites.id, { onDelete: 'set null' }),
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
