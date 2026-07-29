import { index, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from './_shared';
import { downtimeEstadoEnum, downtimeTipoEnum } from './enums';
import { tenants, users } from './core';
import { failureCauses, failureEffects, technicalActions } from './infra';
import { assets } from './assets';
import { workOrders } from './work-orders';

/**
 * Módulo PAROS / AVERÍAS (Fase 8, §4.6) — registra la detención de un
 * activo, programada o no, y alimenta directamente MTBF/MTTR/disponibilidad
 * (Fase 9). Un paro no programado puede convertirse en OT correctiva
 * (§7.5), heredando causa y efecto de falla — mismo criterio que la
 * conversión SS → OT de la Fase 6.
 */
export const downtimes = pgTable(
  'downtimes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    /** Se asigna con `nextCode(tx, tenantId, 'PA')` al registrar: un paro no tiene borrador, ya ocurrió. */
    consecutivo: text('consecutivo').notNull(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    tipo: downtimeTipoEnum('tipo').notNull().default('NO_PROGRAMADO'),
    estado: downtimeEstadoEnum('estado').notNull().default('ABIERTO'),
    fechaInicio: timestamp('fecha_inicio', { withTimezone: true }).notNull(),
    fechaFin: timestamp('fecha_fin', { withTimezone: true }),
    /** Se calcula al cerrar; se guarda para no recalcular en cada reporte de MTBF/MTTR. */
    duracionMinutos: numeric('duracion_minutos', { precision: 18, scale: 2 }),
    causaFallaId: uuid('causa_falla_id').references(() => failureCauses.id, { onDelete: 'set null' }),
    efectoFallaId: uuid('efecto_falla_id').references(() => failureEffects.id, { onDelete: 'set null' }),
    technicalActionId: uuid('technical_action_id').references(() => technicalActions.id, { onDelete: 'set null' }),
    /** Impacto: solo se conoce con certeza al cerrar el paro. */
    impactoUnidadesNoProducidas: numeric('impacto_unidades_no_producidas', { precision: 18, scale: 2 }),
    impactoCostoEstimado: numeric('impacto_costo_estimado', { precision: 18, scale: 4 }),
    workOrderId: uuid('work_order_id').references(() => workOrders.id, { onDelete: 'set null' }),
    responsableReporteUserId: uuid('responsable_reporte_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    observaciones: text('observaciones'),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('downtimes_consecutivo_uq').on(t.tenantId, t.consecutivo),
    index('downtimes_tenant_idx').on(t.tenantId, t.estado),
    index('downtimes_asset_idx').on(t.assetId, t.fechaInicio),
    index('downtimes_wo_idx').on(t.workOrderId),
  ],
);

export type Downtime = typeof downtimes.$inferSelect;
export type NewDowntime = typeof downtimes.$inferInsert;
