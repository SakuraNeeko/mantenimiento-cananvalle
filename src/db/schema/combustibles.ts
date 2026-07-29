import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from './_shared';
import { tenants, users } from './core';
import { fuels, parties } from './infra';
import { assets } from './assets';

/**
 * Módulo COMBUSTIBLES (Fase 10, §4.10) — opcional, activable por tenant
 * (`tenant_modules`, ya sembrada desde la Fase 1). El rendimiento (km/gal,
 * L/h) y la detección de consumos anómalos NO se guardan aquí: se calculan
 * al vuelo comparando cada registro con el anterior del mismo activo
 * (`lib/combustibles/rendimiento.ts`), igual criterio que los KPIs de la
 * Fase 9 — números derivados, no duplicados en la tabla.
 */
export const fuelRecords = pgTable(
  'fuel_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    fuelId: uuid('fuel_id')
      .notNull()
      .references(() => fuels.id, { onDelete: 'restrict' }),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    cantidad: numeric('cantidad', { precision: 18, scale: 4 }).notNull(),
    costoUnitario: numeric('costo_unitario', { precision: 18, scale: 4 }).notNull(),
    costoTotal: numeric('costo_total', { precision: 18, scale: 4 }).notNull(),
    /** Lectura de odómetro (km) u horómetro (h) al momento de cargar — la unidad la define el tipo de activo, no el registro. */
    lectura: numeric('lectura', { precision: 18, scale: 2 }),
    partyId: uuid('party_id').references(() => parties.id, { onDelete: 'set null' }),
    conductorUserId: uuid('conductor_user_id').references(() => users.id, { onDelete: 'set null' }),
    numeroFactura: text('numero_factura'),
    observaciones: text('observaciones'),
    ...auditColumns,
  },
  (t) => [index('fuel_records_tenant_idx').on(t.tenantId, t.fecha), index('fuel_records_asset_idx').on(t.assetId, t.fecha)],
);

export type FuelRecord = typeof fuelRecords.$inferSelect;
export type NewFuelRecord = typeof fuelRecords.$inferInsert;
