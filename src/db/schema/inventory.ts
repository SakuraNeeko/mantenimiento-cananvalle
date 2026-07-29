import { sql } from 'drizzle-orm';
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
import { kardexMovementEstadoEnum, materialTipoEnum, physicalInventoryEstadoEnum } from './enums';
import { tenants } from './core';
import { catalogColumns, kardexConcepts, parties, uoms, warehouses } from './infra';

/**
 * Módulo ALMACÉN Y KÁRDEX (Fase 4): materiales, existencias por almacén con
 * trazabilidad por lote (P-03), y el motor transaccional de kárdex.
 *
 * Regla de oro (§4.4 del prompt maestro): el costo promedio ponderado se
 * recalcula DENTRO de la misma transacción que actualiza la existencia — la
 * lógica vive en `app/(app)/almacen/kardex/actions.ts`, con `dbTx`, nunca
 * con `db`. Un movimiento CONFIRMADO no se edita ni se borra: se anula con
 * un contra-movimiento que referencia al original (`movimientoOrigenId`).
 */

/* -------------------------------------------------------------------------- */
/* 1. MATERIALES                                                              */
/* -------------------------------------------------------------------------- */

export const materials = pgTable(
  'materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    tipo: materialTipoEnum('tipo').notNull().default('REPUESTO'),
    uomId: uuid('uom_id').references(() => uoms.id, { onDelete: 'restrict' }),
    categoria: text('categoria'),
    critico: boolean('critico').notNull().default(false),
    /** Banderas que condicionan el kárdex (P-03): si exige lote/serie al entrar o salir. */
    manejaLote: boolean('maneja_lote').notNull().default(false),
    manejaSerie: boolean('maneja_serie').notNull().default(false),
    imagenUrl: text('imagen_url'),
    activo: boolean('activo').notNull().default(true),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('materials_codigo_uq')
      .on(t.tenantId, t.codigo)
      .where(sql`deleted_at IS NULL`),
    index('materials_tenant_idx').on(t.tenantId),
    index('materials_tipo_idx').on(t.tenantId, t.tipo),
  ],
);

/** Referencia del fabricante y de cada proveedor: precio y tiempo de entrega. */
export const materialReferences = pgTable(
  'material_references',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    partyId: uuid('party_id').references(() => parties.id, { onDelete: 'set null' }),
    fabricante: text('fabricante'),
    referenciaFabricante: text('referencia_fabricante'),
    referenciaProveedor: text('referencia_proveedor'),
    precio: numeric('precio', { precision: 18, scale: 4 }),
    tiempoEntregaDias: integer('tiempo_entrega_dias'),
    ...auditColumns,
  },
  (t) => [index('material_references_material_idx').on(t.materialId)],
);

/**
 * Referencia de repuesto por proveedor (catálogo de Infraestructura, Fase 2).
 * Se administra desde la pantalla genérica de catálogos, igual que antes;
 * solo cambió de archivo para poder llevar `material_id`.
 */
export const references = pgTable(
  'references',
  {
    ...catalogColumns,
    partyId: uuid('party_id').references(() => parties.id, { onDelete: 'set null' }),
    materialId: uuid('material_id').references(() => materials.id, { onDelete: 'set null' }),
    codigoProveedor: text('codigo_proveedor'),
  },
  (t) => [
    uniqueIndex('references_codigo_uq')
      .on(t.tenantId, t.codigo)
      .where(sql`deleted_at IS NULL`),
    index('references_tenant_idx').on(t.tenantId),
  ],
);

/* -------------------------------------------------------------------------- */
/* 2. EXISTENCIAS Y LOTES                                                     */
/* -------------------------------------------------------------------------- */

/** Existencia consolidada por almacén: cantidad, mínimos/máximos y costo promedio ponderado. */
export const warehouseStock = pgTable(
  'warehouse_stock',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    cantidad: numeric('cantidad', { precision: 18, scale: 4 }).notNull().default('0'),
    minimo: numeric('minimo', { precision: 18, scale: 4 }),
    maximo: numeric('maximo', { precision: 18, scale: 4 }),
    puntoPedido: numeric('punto_pedido', { precision: 18, scale: 4 }),
    ubicacionEstante: text('ubicacion_estante'),
    costoPromedio: numeric('costo_promedio', { precision: 18, scale: 4 }).notNull().default('0'),
    ultimaEntradaAt: timestamp('ultima_entrada_at', { withTimezone: true }),
    ultimaSalidaAt: timestamp('ultima_salida_at', { withTimezone: true }),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('warehouse_stock_uq').on(t.warehouseId, t.materialId),
    index('warehouse_stock_material_idx').on(t.materialId),
    index('warehouse_stock_tenant_idx').on(t.tenantId),
  ],
);

/** Saldo por lote/serie, para materiales con `maneja_lote` o `maneja_serie` (P-03). Consumo FEFO por vencimiento. */
export const stockLots = pgTable(
  'stock_lots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    lote: text('lote').notNull(),
    serie: text('serie'),
    fechaVencimiento: date('fecha_vencimiento'),
    cantidad: numeric('cantidad', { precision: 18, scale: 4 }).notNull().default('0'),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('stock_lots_uq').on(t.warehouseId, t.materialId, t.lote),
    index('stock_lots_material_idx').on(t.materialId),
    index('stock_lots_vencimiento_idx').on(t.materialId, t.fechaVencimiento),
  ],
);

/* -------------------------------------------------------------------------- */
/* 3. KÁRDEX                                                                  */
/* -------------------------------------------------------------------------- */

export const kardexMovements = pgTable(
  'kardex_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    /** Se asigna con `nextCode(tx, tenantId, 'KX')` recién al CONFIRMAR — un borrador descartado no gasta consecutivo. */
    consecutivo: text('consecutivo'),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    kardexConceptId: uuid('kardex_concept_id')
      .notNull()
      .references(() => kardexConcepts.id, { onDelete: 'restrict' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    /** Exigido cuando `kardex_concepts.exige_tercero` es verdadero. */
    partyId: uuid('party_id').references(() => parties.id, { onDelete: 'set null' }),
    /**
     * ⚠️ SOLUCIÓN RÁPIDA: referencia libre a la OT (texto), no FK — `work_orders`
     * no existe hasta la Fase 6. Cuando exista, se añade `work_order_id` por
     * migración manual, igual que pasó con `references.material_id`.
     */
    documentoSoporte: text('documento_soporte'),
    estado: kardexMovementEstadoEnum('estado').notNull().default('BORRADOR'),
    motivoAnulacion: text('motivo_anulacion'),
    /** Si este movimiento es un contra-movimiento, apunta al que anula. */
    movimientoOrigenId: uuid('movimiento_origen_id').references((): AnyPgColumn => kardexMovements.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
    confirmadoAt: timestamp('confirmado_at', { withTimezone: true }),
    confirmadoBy: uuid('confirmado_by'),
  },
  (t) => [
    uniqueIndex('kardex_movements_consecutivo_uq').on(t.tenantId, t.consecutivo),
    index('kardex_movements_tenant_idx').on(t.tenantId, t.fecha),
    index('kardex_movements_warehouse_idx').on(t.warehouseId),
    index('kardex_movements_estado_idx').on(t.tenantId, t.estado),
  ],
);

export const kardexMovementLines = pgTable(
  'kardex_movement_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    movementId: uuid('movement_id')
      .notNull()
      .references(() => kardexMovements.id, { onDelete: 'cascade' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    cantidad: numeric('cantidad', { precision: 18, scale: 4 }).notNull(),
    costoUnitario: numeric('costo_unitario', { precision: 18, scale: 4 }).notNull().default('0'),
    costoTotal: numeric('costo_total', { precision: 18, scale: 4 }).notNull().default('0'),
    lote: text('lote'),
    serie: text('serie'),
    fechaVencimiento: date('fecha_vencimiento'),
    /** Saldo del material en el almacén justo después de aplicar esta línea. Se llena al confirmar. */
    saldoResultante: numeric('saldo_resultante', { precision: 18, scale: 4 }),
  },
  (t) => [index('kardex_movement_lines_movement_idx').on(t.movementId), index('kardex_movement_lines_material_idx').on(t.materialId)],
);

/* -------------------------------------------------------------------------- */
/* 4. INVENTARIO FÍSICO                                                       */
/* -------------------------------------------------------------------------- */

export const physicalInventories = pgTable(
  'physical_inventories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    estado: physicalInventoryEstadoEnum('estado').notNull().default('BORRADOR'),
    confirmadoAt: timestamp('confirmado_at', { withTimezone: true }),
    confirmadoBy: uuid('confirmado_by'),
    ...createdColumns,
  },
  (t) => [index('physical_inventories_tenant_idx').on(t.tenantId, t.warehouseId)],
);

/** Un snapshot de la cantidad de sistema al abrir la toma, más lo contado. La diferencia genera el ajuste al confirmar. */
export const physicalInventoryLines = pgTable(
  'physical_inventory_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inventoryId: uuid('inventory_id')
      .notNull()
      .references(() => physicalInventories.id, { onDelete: 'cascade' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    cantidadSistema: numeric('cantidad_sistema', { precision: 18, scale: 4 }).notNull(),
    cantidadContada: numeric('cantidad_contada', { precision: 18, scale: 4 }),
  },
  (t) => [uniqueIndex('physical_inventory_lines_uq').on(t.inventoryId, t.materialId)],
);

/* -------------------------------------------------------------------------- */
/* TIPOS INFERIDOS                                                            */
/* -------------------------------------------------------------------------- */

export type Material = typeof materials.$inferSelect;
export type MaterialReference = typeof materialReferences.$inferSelect;
export type WarehouseStock = typeof warehouseStock.$inferSelect;
export type StockLot = typeof stockLots.$inferSelect;
export type KardexMovement = typeof kardexMovements.$inferSelect;
export type KardexMovementLine = typeof kardexMovementLines.$inferSelect;
export type PhysicalInventory = typeof physicalInventories.$inferSelect;
export type PhysicalInventoryLine = typeof physicalInventoryLines.$inferSelect;
