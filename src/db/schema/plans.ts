import { boolean, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { auditColumns, createdColumns } from './_shared';
import {
  assetClaseEnum,
  criticalityEnum,
  planAlcanceEnum,
  planGenerationResultadoEnum,
  planIntervaloUnidadEnum,
  planReprogramacionModoEnum,
  planResourceTipoEnum,
  planTriggerTipoEnum,
  priorityEnum,
  woTaskTipoRespuestaEnum,
} from './enums';
import { tenants } from './core';
import { locations, maintenanceTypes, magnitudes, meters, responsibles, trades, workTypes } from './infra';
import { assets } from './assets';
import { materials } from './inventory';
import { workOrders } from './work-orders';

/**
 * Módulo PLANES DE MANTENIMIENTO (Fase 7, §4.7) — plantillas que el cron
 * diario (o el botón de generación manual) convierte en `work_orders` reales
 * con `origen = 'PLAN'`. `plan_tasks` y `plan_resources` se copian tal cual
 * a `wo_tasks`/`wo_labor`/`wo_materials` en el momento de generar (Fase 6).
 */

export const maintenancePlans = pgTable(
  'maintenance_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    maintenanceTypeId: uuid('maintenance_type_id').references(() => maintenanceTypes.id, { onDelete: 'set null' }),
    workTypeId: uuid('work_type_id').references(() => workTypes.id, { onDelete: 'set null' }),
    alcance: planAlcanceEnum('alcance').notNull().default('ACTIVO_UNICO'),
    /** Solo si alcance = ACTIVO_UNICO. */
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }),
    /** Filtros combinables (AND) solo si alcance = GRUPO; NULL en cada uno = "cualquiera". */
    claseFiltro: assetClaseEnum('clase_filtro'),
    criticidadFiltro: criticalityEnum('criticidad_filtro'),
    locationFiltro: uuid('location_filtro').references(() => locations.id, { onDelete: 'set null' }),
    responsibleDefaultId: uuid('responsible_default_id').references(() => responsibles.id, { onDelete: 'set null' }),
    prioridad: priorityEnum('prioridad').notNull().default('MEDIA'),
    tiempoEstimadoHoras: numeric('tiempo_estimado_horas', { precision: 10, scale: 2 }),
    instrucciones: text('instrucciones'),
    activo: boolean('activo').notNull().default(true),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('maintenance_plans_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('maintenance_plans_tenant_idx').on(t.tenantId, t.activo),
    index('maintenance_plans_asset_idx').on(t.assetId),
  ],
);

/** Disparadores múltiples y combinables por plan (§4.7). */
export const planTriggers = pgTable(
  'plan_triggers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => maintenancePlans.id, { onDelete: 'cascade' }),
    tipo: planTriggerTipoEnum('tipo').notNull(),
    activo: boolean('activo').notNull().default(true),
    modoReprogramacion: planReprogramacionModoEnum('modo_reprogramacion').notNull().default('FIJO'),
    diasAnticipacion: integer('dias_anticipacion').notNull().default(0),
    /** CALENDARIO: cada `intervaloValor` `intervaloUnidad`, contado desde `fechaBase` (o la última generación). */
    intervaloValor: integer('intervalo_valor'),
    intervaloUnidad: planIntervaloUnidadEnum('intervalo_unidad'),
    fechaBase: date('fecha_base'),
    /** CONTADOR: cada `intervaloContador` unidades del medidor `meterId`. */
    meterId: uuid('meter_id').references(() => meters.id, { onDelete: 'set null' }),
    intervaloContador: numeric('intervalo_contador', { precision: 18, scale: 4 }),
    umbralAviso: numeric('umbral_aviso', { precision: 18, scale: 4 }),
    /** CONDICION: fuera de [rangoMin, rangoMax] de `magnitudId`. Evaluación automática diferida — ver ENTREGA-FASE-7.md. */
    magnitudId: uuid('magnitud_id').references(() => magnitudes.id, { onDelete: 'set null' }),
    rangoMin: numeric('rango_min', { precision: 18, scale: 4 }),
    rangoMax: numeric('rango_max', { precision: 18, scale: 4 }),
    /** EVENTO: descripción libre del evento disparador. Evaluación automática diferida — depende del módulo Paros (Fase 8). */
    eventoDescripcion: text('evento_descripcion'),
    ...auditColumns,
  },
  (t) => [index('plan_triggers_plan_idx').on(t.planId)],
);

/** Checklist plantilla: se copia a `wo_tasks` en cada generación (mismas columnas que la Fase 6). */
export const planTasks = pgTable(
  'plan_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => maintenancePlans.id, { onDelete: 'cascade' }),
    orden: integer('orden').notNull().default(1),
    descripcion: text('descripcion').notNull(),
    tipoRespuesta: woTaskTipoRespuestaEnum('tipo_respuesta').notNull().default('OK_NO_OK'),
    esCritica: boolean('es_critica').notNull().default(false),
    tradeId: uuid('trade_id').references(() => trades.id, { onDelete: 'set null' }),
    duracionMinutos: integer('duracion_minutos'),
    instrucciones: text('instrucciones'),
    ...createdColumns,
  },
  (t) => [index('plan_tasks_plan_idx').on(t.planId, t.orden)],
);

/** Mano de obra y materiales previstos: se copian a `wo_labor`/`wo_materials` al generar. */
export const planResources = pgTable(
  'plan_resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => maintenancePlans.id, { onDelete: 'cascade' }),
    tipo: planResourceTipoEnum('tipo').notNull(),
    tradeId: uuid('trade_id').references(() => trades.id, { onDelete: 'set null' }),
    horasEstimadas: numeric('horas_estimadas', { precision: 10, scale: 2 }),
    materialId: uuid('material_id').references(() => materials.id, { onDelete: 'set null' }),
    cantidadEstimada: numeric('cantidad_estimada', { precision: 18, scale: 4 }),
    costoEstimado: numeric('costo_estimado', { precision: 18, scale: 4 }),
    ...createdColumns,
  },
  (t) => [index('plan_resources_plan_idx').on(t.planId)],
);

/** Trazabilidad de cada evaluación de generación (§4.7): una fila por (plan, disparador, activo) evaluados, generen OT o no. */
export const planGenerationLog = pgTable(
  'plan_generation_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => maintenancePlans.id, { onDelete: 'cascade' }),
    triggerId: uuid('trigger_id').references(() => planTriggers.id, { onDelete: 'set null' }),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
    workOrderId: uuid('work_order_id').references(() => workOrders.id, { onDelete: 'set null' }),
    resultado: planGenerationResultadoEnum('resultado').notNull(),
    fechaProyectada: timestamp('fecha_proyectada', { withTimezone: true }),
    lecturaMedidor: numeric('lectura_medidor', { precision: 18, scale: 4 }),
    detalle: text('detalle'),
    fechaEvaluacion: timestamp('fecha_evaluacion', { withTimezone: true }).notNull().defaultNow(),
    ...createdColumns,
  },
  (t) => [
    index('plan_generation_log_plan_idx').on(t.planId, t.fechaEvaluacion),
    index('plan_generation_log_asset_idx').on(t.assetId),
  ],
);

export type MaintenancePlan = typeof maintenancePlans.$inferSelect;
export type NewMaintenancePlan = typeof maintenancePlans.$inferInsert;
export type PlanTrigger = typeof planTriggers.$inferSelect;
export type PlanTask = typeof planTasks.$inferSelect;
export type PlanResource = typeof planResources.$inferSelect;
export type PlanGenerationLog = typeof planGenerationLog.$inferSelect;
