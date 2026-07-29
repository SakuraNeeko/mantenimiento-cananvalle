import { index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { periodoTipoEnum } from './enums';
import { tenants } from './core';

/**
 * Módulo HISTORIA Y KPIs (Fase 9, §4.9 y §5). `wo_history` y `archived_history`
 * son copias INMUTABLES: una vez escritas no se actualizan — cerrar el ciclo
 * de vida de la OT en `EN_HISTORIA` no debe poder alterar lo que se reportó.
 *
 * Simplificación documentada: en vez de replicar `wo_tasks`/`wo_labor`/
 * `wo_materials`/`wo_third_party_costs`/`wo_other_costs`/`wo_comments`/
 * `wo_status_history` como siete tablas hijas adicionales, cada fila guarda
 * las columnas que se necesitan para filtrar y sumar en los reportes, más un
 * `snapshot` jsonb con el detalle completo — un "hoja de vida" ya no cambia
 * aunque el catálogo de origen (activo, causa, centro de costo…) sí lo haga,
 * así que las columnas de detalle son texto plano, no llaves foráneas.
 */

/** Columnas idénticas para `wo_history` y `archived_history` — misma forma, distinto propósito. */
const columnasHistoria = {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  workOrderId: uuid('work_order_id').notNull(),
  consecutivo: text('consecutivo').notNull(),
  origen: text('origen').notNull(),
  assetId: uuid('asset_id'),
  assetCodigo: text('asset_codigo'),
  assetNombre: text('asset_nombre'),
  maintenanceTypeNombre: text('maintenance_type_nombre'),
  costCenterId: uuid('cost_center_id'),
  costCenterNombre: text('cost_center_nombre'),
  prioridad: text('prioridad').notNull(),
  criticidad: text('criticidad').notNull(),
  descripcionProblema: text('descripcion_problema').notNull(),
  causaFallaNombre: text('causa_falla_nombre'),
  efectoFallaNombre: text('efecto_falla_nombre'),
  causaCierreNombre: text('causa_cierre_nombre'),
  fechaCreacion: timestamp('fecha_creacion', { withTimezone: true }).notNull(),
  fechaProgramada: timestamp('fecha_programada', { withTimezone: true }),
  fechaInicioReal: timestamp('fecha_inicio_real', { withTimezone: true }),
  fechaFinReal: timestamp('fecha_fin_real', { withTimezone: true }),
  cerradaAt: timestamp('cerrada_at', { withTimezone: true }),
  costoManoObra: numeric('costo_mano_obra', { precision: 18, scale: 4 }).notNull().default('0'),
  costoMateriales: numeric('costo_materiales', { precision: 18, scale: 4 }).notNull().default('0'),
  costoTerceros: numeric('costo_terceros', { precision: 18, scale: 4 }).notNull().default('0'),
  costoOtros: numeric('costo_otros', { precision: 18, scale: 4 }).notNull().default('0'),
  costoTotal: numeric('costo_total', { precision: 18, scale: 4 }).notNull().default('0'),
  tiempoEstimadoHoras: numeric('tiempo_estimado_horas', { precision: 10, scale: 2 }),
  /** { tareas, manoObra, materiales, costosTerceros, costosOtros, comentarios, historialEstados }. */
  snapshot: jsonb('snapshot').notNull(),
  enviadaHistoriaAt: timestamp('enviada_historia_at', { withTimezone: true }).notNull().defaultNow(),
  enviadaHistoriaBy: uuid('enviada_historia_by'),
};

export const woHistory = pgTable(
  'wo_history',
  { ...columnasHistoria },
  (t) => [
    uniqueIndex('wo_history_work_order_uq').on(t.workOrderId),
    index('wo_history_tenant_idx').on(t.tenantId, t.fechaFinReal),
    index('wo_history_asset_idx').on(t.assetId),
  ],
);

export const archivedHistory = pgTable(
  'archived_history',
  {
    ...columnasHistoria,
    archivedAt: timestamp('archived_at', { withTimezone: true }).notNull().defaultNow(),
    archivedBy: uuid('archived_by'),
  },
  (t) => [
    uniqueIndex('archived_history_work_order_uq').on(t.workOrderId),
    index('archived_history_tenant_idx').on(t.tenantId, t.fechaFinReal),
    index('archived_history_asset_idx').on(t.assetId),
  ],
);

/**
 * Balance periódico de gestión (§4.9): un snapshot calculado, no una vista —
 * una vez generado para un periodo, no cambia aunque después se cierren más
 * OT dentro de esas fechas (igual criterio de inmutabilidad que la historia).
 */
export const periodicBalance = pgTable(
  'periodic_balance',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    tipo: periodoTipoEnum('tipo').notNull(),
    anio: integer('anio').notNull(),
    /** Mes (1-12) o trimestre (1-4); `0` cuando `tipo = 'ANIO'` — nunca NULL, para que el índice único por periodo funcione (Postgres trata cada NULL como distinto). */
    numero: integer('numero').notNull().default(0),
    fechaInicio: timestamp('fecha_inicio', { withTimezone: true }).notNull(),
    fechaFin: timestamp('fecha_fin', { withTimezone: true }).notNull(),
    costoManoObra: numeric('costo_mano_obra', { precision: 18, scale: 4 }).notNull().default('0'),
    costoMateriales: numeric('costo_materiales', { precision: 18, scale: 4 }).notNull().default('0'),
    costoTerceros: numeric('costo_terceros', { precision: 18, scale: 4 }).notNull().default('0'),
    costoOtros: numeric('costo_otros', { precision: 18, scale: 4 }).notNull().default('0'),
    costoTotal: numeric('costo_total', { precision: 18, scale: 4 }).notNull().default('0'),
    otCerradas: integer('ot_cerradas').notNull().default(0),
    otPreventivas: integer('ot_preventivas').notNull().default(0),
    otCorrectivas: integer('ot_correctivas').notNull().default(0),
    cumplimientoPlan: numeric('cumplimiento_plan', { precision: 6, scale: 2 }),
    indicePreventivo: numeric('indice_preventivo', { precision: 6, scale: 2 }),
    mtbfHoras: numeric('mtbf_horas', { precision: 18, scale: 2 }),
    mttrHoras: numeric('mttr_horas', { precision: 18, scale: 2 }),
    disponibilidad: numeric('disponibilidad', { precision: 6, scale: 2 }),
    cumplimientoSla: numeric('cumplimiento_sla', { precision: 6, scale: 2 }),
    /** Desglose por centro de costo, tipo de mantenimiento y activo — demasiado variable para columnas fijas. */
    desglose: jsonb('desglose').notNull(),
    calculadoAt: timestamp('calculado_at', { withTimezone: true }).notNull().defaultNow(),
    calculadoBy: uuid('calculado_by'),
  },
  (t) => [
    uniqueIndex('periodic_balance_periodo_uq').on(t.tenantId, t.tipo, t.anio, t.numero),
    index('periodic_balance_tenant_idx').on(t.tenantId, t.fechaInicio),
  ],
);

export type WoHistory = typeof woHistory.$inferSelect;
export type ArchivedHistory = typeof archivedHistory.$inferSelect;
export type PeriodicBalance = typeof periodicBalance.$inferSelect;
