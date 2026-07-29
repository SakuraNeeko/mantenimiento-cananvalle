import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { auditColumns, createdColumns } from './_shared';
import { criticalityEnum, priorityEnum, woOrigenEnum, woStatusEnum, woTaskTipoRespuestaEnum } from './enums';
import { tenants, users } from './core';
import {
  contracts,
  costCenters,
  failureCauses,
  failureEffects,
  locations,
  maintenanceTypes,
  otherCostConcepts,
  parties,
  responsibleCenters,
  responsibles,
  technicalActions,
  warehouses,
  woClosingCauses,
  woPendingCauses,
  workTypes,
} from './infra';
import { assets } from './assets';
import { kardexMovements, materials } from './inventory';
import { serviceRequests } from './service-requests';

/**
 * Módulo ÓRDENES DE TRABAJO (Fase 6) — el centro de gestión (§4.8). Cierra
 * dos deudas técnicas explícitas de fases anteriores: la conversión
 * SS → OT (Fase 5) y el `exige_ot` de los conceptos de kárdex (Fase 4),
 * que ahora sí puede apuntar a una OT real.
 *
 * Estados (P-02, Fase 1: sin `APROBADA` — PLANIFICADA pasa directo a ASIGNADA):
 * BORRADOR → PLANIFICADA → ASIGNADA → EN_EJECUCION ⇄ PENDIENTE → EJECUTADA
 * → LIQUIDADA → CERRADA (+ CANCELADA). `EN_HISTORIA` está en el enum desde
 * la Fase 1 pero el envío en lote es de la Fase 9.
 */

export const workOrders = pgTable(
  'work_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    /** Se asigna con `nextCode(tx, tenantId, 'OT')` al planificar, no al crear. */
    consecutivo: text('consecutivo'),
    origen: woOrigenEnum('origen').notNull().default('MANUAL'),
    serviceRequestId: uuid('service_request_id').references(() => serviceRequests.id, { onDelete: 'set null' }),
    /** Despiece de OT: una OT padre puede abrir varias hijas. */
    parentWorkOrderId: uuid('parent_work_order_id').references((): AnyPgColumn => workOrders.id, { onDelete: 'set null' }),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    costCenterId: uuid('cost_center_id').references(() => costCenters.id, { onDelete: 'set null' }),
    responsibleCenterId: uuid('responsible_center_id').references(() => responsibleCenters.id, { onDelete: 'set null' }),
    maintenanceTypeId: uuid('maintenance_type_id').references(() => maintenanceTypes.id, { onDelete: 'set null' }),
    workTypeId: uuid('work_type_id').references(() => workTypes.id, { onDelete: 'set null' }),
    prioridad: priorityEnum('prioridad').notNull().default('MEDIA'),
    criticidad: criticalityEnum('criticidad').notNull().default('C'),
    descripcionProblema: text('descripcion_problema').notNull(),
    estado: woStatusEnum('estado').notNull().default('BORRADOR'),
    fechaProgramada: timestamp('fecha_programada', { withTimezone: true }),
    fechaInicioReal: timestamp('fecha_inicio_real', { withTimezone: true }),
    fechaFinReal: timestamp('fecha_fin_real', { withTimezone: true }),
    responsablePrincipalUserId: uuid('responsable_principal_user_id').references(() => users.id, { onDelete: 'set null' }),
    contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'set null' }),
    partyId: uuid('party_id').references(() => parties.id, { onDelete: 'set null' }),
    /** Almacén del que se descuentan los materiales al liquidar. */
    warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'set null' }),
    causaPendienteId: uuid('causa_pendiente_id').references(() => woPendingCauses.id, { onDelete: 'set null' }),
    causaCierreId: uuid('causa_cierre_id').references(() => woClosingCauses.id, { onDelete: 'set null' }),
    causaFallaId: uuid('causa_falla_id').references(() => failureCauses.id, { onDelete: 'set null' }),
    efectoFallaId: uuid('efecto_falla_id').references(() => failureEffects.id, { onDelete: 'set null' }),
    technicalActionId: uuid('technical_action_id').references(() => technicalActions.id, { onDelete: 'set null' }),
    requiereParo: boolean('requiere_paro').notNull().default(false),
    permisoTrabajoRequerido: boolean('permiso_trabajo_requerido').notNull().default(false),
    motivoPendiente: text('motivo_pendiente'),
    motivoCancelacion: text('motivo_cancelacion'),
    /** Se recalculan al LIQUIDAR, sumando wo_labor + wo_materials + wo_third_party_costs + wo_other_costs. */
    costoManoObra: numeric('costo_mano_obra', { precision: 18, scale: 4 }).notNull().default('0'),
    costoMateriales: numeric('costo_materiales', { precision: 18, scale: 4 }).notNull().default('0'),
    costoTerceros: numeric('costo_terceros', { precision: 18, scale: 4 }).notNull().default('0'),
    costoOtros: numeric('costo_otros', { precision: 18, scale: 4 }).notNull().default('0'),
    costoTotal: numeric('costo_total', { precision: 18, scale: 4 }).notNull().default('0'),
    tiempoEstimadoHoras: numeric('tiempo_estimado_horas', { precision: 10, scale: 2 }),
    /**
     * Firma digital simple: quién confirmó y cuándo, no un trazo dibujado.
     * ⚠️ SOLUCIÓN RÁPIDA: ver deuda técnica en ENTREGA-FASE-6.md.
     */
    firmaEjecutorUserId: uuid('firma_ejecutor_user_id').references(() => users.id, { onDelete: 'set null' }),
    firmaEjecutorAt: timestamp('firma_ejecutor_at', { withTimezone: true }),
    firmaAprobadorUserId: uuid('firma_aprobador_user_id').references(() => users.id, { onDelete: 'set null' }),
    firmaAprobadorAt: timestamp('firma_aprobador_at', { withTimezone: true }),
    liquidadaAt: timestamp('liquidada_at', { withTimezone: true }),
    liquidadaBy: uuid('liquidada_by'),
    cerradaAt: timestamp('cerrada_at', { withTimezone: true }),
    cerradaBy: uuid('cerrada_by'),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('work_orders_consecutivo_uq').on(t.tenantId, t.consecutivo),
    index('work_orders_tenant_idx').on(t.tenantId, t.estado),
    index('work_orders_asset_idx').on(t.assetId),
    index('work_orders_responsable_idx').on(t.responsablePrincipalUserId),
    index('work_orders_parent_idx').on(t.parentWorkOrderId),
    index('work_orders_sr_idx').on(t.serviceRequestId),
  ],
);

/** Checklist ejecutable. En la Fase 7 heredará de `plan_tasks`; por ahora se escribe directo en la OT. */
export const woTasks = pgTable(
  'wo_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    orden: integer('orden').notNull().default(1),
    descripcion: text('descripcion').notNull(),
    tipoRespuesta: woTaskTipoRespuestaEnum('tipo_respuesta').notNull().default('OK_NO_OK'),
    esCritica: boolean('es_critica').notNull().default(false),
    resultado: text('resultado'),
    valorMedido: numeric('valor_medido', { precision: 18, scale: 4 }),
    observacion: text('observacion'),
    fotoUrl: text('foto_url'),
    completadaAt: timestamp('completada_at', { withTimezone: true }),
    completadaBy: uuid('completada_by'),
    ...createdColumns,
  },
  (t) => [index('wo_tasks_wo_idx').on(t.workOrderId, t.orden)],
);

export const woLabor = pgTable(
  'wo_labor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    responsibleId: uuid('responsible_id').references(() => responsibles.id, { onDelete: 'set null' }),
    fecha: date('fecha').notNull(),
    horasNormales: numeric('horas_normales', { precision: 6, scale: 2 }).notNull().default('0'),
    horasExtras: numeric('horas_extras', { precision: 6, scale: 2 }).notNull().default('0'),
    horasNocturnas: numeric('horas_nocturnas', { precision: 6, scale: 2 }).notNull().default('0'),
    costoCalculado: numeric('costo_calculado', { precision: 18, scale: 4 }).notNull().default('0'),
    ...createdColumns,
  },
  (t) => [index('wo_labor_wo_idx').on(t.workOrderId)],
);

/** El kárdex real se dispara al LIQUIDAR: `kardexMovementId` queda null hasta ese momento. */
export const woMaterials = pgTable(
  'wo_materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    cantidadSolicitada: numeric('cantidad_solicitada', { precision: 18, scale: 4 }).notNull(),
    cantidadEntregada: numeric('cantidad_entregada', { precision: 18, scale: 4 }),
    costoUnitario: numeric('costo_unitario', { precision: 18, scale: 4 }),
    costoTotal: numeric('costo_total', { precision: 18, scale: 4 }),
    kardexMovementId: uuid('kardex_movement_id').references(() => kardexMovements.id, { onDelete: 'set null' }),
    ...createdColumns,
  },
  (t) => [index('wo_materials_wo_idx').on(t.workOrderId)],
);

export const woThirdPartyCosts = pgTable(
  'wo_third_party_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    partyId: uuid('party_id').references(() => parties.id, { onDelete: 'set null' }),
    descripcion: text('descripcion').notNull(),
    monto: numeric('monto', { precision: 18, scale: 4 }).notNull(),
    ...createdColumns,
  },
  (t) => [index('wo_third_party_costs_wo_idx').on(t.workOrderId)],
);

export const woOtherCosts = pgTable(
  'wo_other_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    otherCostConceptId: uuid('other_cost_concept_id').references(() => otherCostConcepts.id, { onDelete: 'set null' }),
    descripcion: text('descripcion').notNull(),
    monto: numeric('monto', { precision: 18, scale: 4 }).notNull(),
    ...createdColumns,
  },
  (t) => [index('wo_other_costs_wo_idx').on(t.workOrderId)],
);

export const woComments = pgTable(
  'wo_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    mensaje: text('mensaje').notNull(),
    ...createdColumns,
  },
  (t) => [index('wo_comments_wo_idx').on(t.workOrderId, t.createdAt)],
);

export const woStatusHistory = pgTable(
  'wo_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workOrders.id, { onDelete: 'cascade' }),
    estadoAnterior: woStatusEnum('estado_anterior'),
    estadoNuevo: woStatusEnum('estado_nuevo').notNull(),
    motivo: text('motivo'),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    ...createdColumns,
  },
  (t) => [index('wo_status_history_wo_idx').on(t.workOrderId, t.fecha)],
);

export type WorkOrder = typeof workOrders.$inferSelect;
export type NewWorkOrder = typeof workOrders.$inferInsert;
export type WoTask = typeof woTasks.$inferSelect;
export type WoLabor = typeof woLabor.$inferSelect;
export type WoMaterial = typeof woMaterials.$inferSelect;
export type WoThirdPartyCost = typeof woThirdPartyCosts.$inferSelect;
export type WoOtherCost = typeof woOtherCosts.$inferSelect;
export type WoComment = typeof woComments.$inferSelect;
export type WoStatusHistory = typeof woStatusHistory.$inferSelect;
