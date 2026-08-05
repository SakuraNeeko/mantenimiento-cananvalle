import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { auditColumns, createdColumns } from './_shared';
import { assetDocumentoTipoEnum, assetEstadoEnum, criticalityEnum, meterReadingOrigenEnum } from './enums';
import { tenants } from './core';
import { assetClasses, characteristics, contracts, costCenters, locations, meters, parties, responsibleCenters } from './infra';
import { materials } from './inventory';

/**
 * Módulo ACTIVOS (Fase 3): el primer módulo que consume de verdad los
 * catálogos de la Fase 2. Patrón maestro-detalle con pestañas (§6 del
 * prompt maestro): `assets` es la ficha general; el resto son las
 * "vistas parciales" — características, medidores, documentos, traslados
 * e historial de estado (hoja de vida).
 */

/* -------------------------------------------------------------------------- */
/* 1. ACTIVOS                                                                 */
/* -------------------------------------------------------------------------- */

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    /** Despiece: jerarquía padre/hijo ilimitada. */
    parentId: uuid('parent_id').references((): AnyPgColumn => assets.id, { onDelete: 'set null' }),
    claseId: uuid('clase_id')
      .notNull()
      .references(() => assetClasses.id, { onDelete: 'restrict' }),
    estado: assetEstadoEnum('estado').notNull().default('OPERATIVO'),
    criticidad: criticalityEnum('criticidad').notNull().default('C'),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    costCenterId: uuid('cost_center_id').references(() => costCenters.id, { onDelete: 'set null' }),
    responsibleCenterId: uuid('responsible_center_id').references(() => responsibleCenters.id, { onDelete: 'set null' }),
    fabricante: text('fabricante'),
    modelo: text('modelo'),
    serie: text('serie'),
    anio: integer('anio'),
    fechaCompra: date('fecha_compra'),
    valorCompra: numeric('valor_compra', { precision: 18, scale: 4 }),
    valorActual: numeric('valor_actual', { precision: 18, scale: 4 }),
    vidaUtilMeses: integer('vida_util_meses'),
    garantiaFin: date('garantia_fin'),
    diasAlertaGarantia: integer('dias_alerta_garantia').notNull().default(30),
    /** Proveedor del activo. */
    partyId: uuid('party_id').references(() => parties.id, { onDelete: 'set null' }),
    contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'set null' }),
    fotoUrl: text('foto_url'),
    latitud: text('latitud'),
    longitud: text('longitud'),
    descripcion: text('descripcion'),
    activo: boolean('activo').notNull().default(true),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('assets_codigo_uq')
      .on(t.tenantId, t.codigo)
      .where(sql`deleted_at IS NULL`),
    index('assets_tenant_idx').on(t.tenantId),
    index('assets_parent_idx').on(t.parentId),
    index('assets_location_idx').on(t.locationId),
    index('assets_clase_id_idx').on(t.tenantId, t.claseId),
    index('assets_estado_idx').on(t.tenantId, t.estado),
  ],
);

/* -------------------------------------------------------------------------- */
/* 2. FICHA TÉCNICA — CARACTERÍSTICAS DINÁMICAS                               */
/* -------------------------------------------------------------------------- */

export const assetCharacteristics = pgTable(
  'asset_characteristics',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    characteristicId: uuid('characteristic_id')
      .notNull()
      .references(() => characteristics.id, { onDelete: 'cascade' }),
    /** El tipo real (texto/número/booleano/fecha/opción) lo define `characteristics.tipoDato`. */
    valor: text('valor'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (t) => [primaryKey({ columns: [t.assetId, t.characteristicId] })],
);

/* -------------------------------------------------------------------------- */
/* 3. MEDIDORES Y LECTURAS                                                    */
/* -------------------------------------------------------------------------- */

export const assetMeters = pgTable(
  'asset_meters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    meterId: uuid('meter_id')
      .notNull()
      .references(() => meters.id, { onDelete: 'restrict' }),
    valorActual: numeric('valor_actual', { precision: 18, scale: 4 }).notNull().default('0'),
    promedioUsoDiario: numeric('promedio_uso_diario', { precision: 18, scale: 4 }),
    /** Rango normal de lectura para este activo (Fase 12, disparador "medidor fuera de rango"). Vacío = sin vigilancia de rango, solo uso/desgaste. */
    rangoMin: numeric('rango_min', { precision: 18, scale: 4 }),
    rangoMax: numeric('rango_max', { precision: 18, scale: 4 }),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('asset_meters_uq')
      .on(t.assetId, t.meterId)
      .where(sql`deleted_at IS NULL`),
    index('asset_meters_asset_idx').on(t.assetId),
  ],
);

/**
 * Histórico de lecturas, append-only. La validación de retroceso (regla de
 * negocio: una lectura no puede ser menor que la anterior, salvo que el
 * medidor lo permita) vive en el servicio, no aquí — la tabla solo registra.
 */
export const meterReadings = pgTable(
  'meter_readings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assetMeterId: uuid('asset_meter_id')
      .notNull()
      .references(() => assetMeters.id, { onDelete: 'cascade' }),
    valor: numeric('valor', { precision: 18, scale: 4 }).notNull(),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    origen: meterReadingOrigenEnum('origen').notNull().default('MANUAL'),
    observacion: text('observacion'),
    ...createdColumns,
  },
  (t) => [index('meter_readings_asset_meter_idx').on(t.assetMeterId, t.fecha)],
);

/* -------------------------------------------------------------------------- */
/* 4. DOCUMENTOS                                                              */
/* -------------------------------------------------------------------------- */

/** Manuales, planos, certificados y garantías. El archivo en sí vive en Vercel Blob; aquí solo la referencia. */
export const assetDocuments = pgTable(
  'asset_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    tipo: assetDocumentoTipoEnum('tipo').notNull().default('OTRO'),
    nombre: text('nombre').notNull(),
    blobUrl: text('blob_url').notNull(),
    mimeType: text('mime_type').notNull(),
    bytes: integer('bytes').notNull(),
    ...auditColumns,
  },
  (t) => [index('asset_documents_asset_idx').on(t.assetId)],
);

/* -------------------------------------------------------------------------- */
/* 5. TRASLADOS                                                               */
/* -------------------------------------------------------------------------- */

/** Traslados entre ubicaciones/centros de costo, append-only: la ficha del activo siempre refleja el último. */
export const assetTransfers = pgTable(
  'asset_transfers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    locationOrigenId: uuid('location_origen_id').references(() => locations.id, { onDelete: 'set null' }),
    locationDestinoId: uuid('location_destino_id').references(() => locations.id, { onDelete: 'set null' }),
    costCenterOrigenId: uuid('cost_center_origen_id').references(() => costCenters.id, { onDelete: 'set null' }),
    costCenterDestinoId: uuid('cost_center_destino_id').references(() => costCenters.id, { onDelete: 'set null' }),
    motivo: text('motivo'),
    ...createdColumns,
  },
  (t) => [index('asset_transfers_asset_idx').on(t.assetId, t.fecha)],
);

/* -------------------------------------------------------------------------- */
/* 6. HISTORIAL DE ESTADO — HOJA DE VIDA                                      */
/* -------------------------------------------------------------------------- */

export const assetStatusHistory = pgTable(
  'asset_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    estadoAnterior: assetEstadoEnum('estado_anterior'),
    estadoNuevo: assetEstadoEnum('estado_nuevo').notNull(),
    motivo: text('motivo'),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    ...createdColumns,
  },
  (t) => [index('asset_status_history_asset_idx').on(t.assetId, t.fecha)],
);

/* -------------------------------------------------------------------------- */
/* 7. LISTA DE MATERIALES (BOM) — diferido de la Fase 3, `materials` ya existe */
/* -------------------------------------------------------------------------- */

export const assetSpareParts = pgTable(
  'asset_spare_parts',
  {
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    cantidad: numeric('cantidad', { precision: 18, scale: 4 }).notNull().default('1'),
    ...createdColumns,
  },
  (t) => [primaryKey({ columns: [t.assetId, t.materialId] })],
);

/* -------------------------------------------------------------------------- */
/* TIPOS INFERIDOS                                                            */
/* -------------------------------------------------------------------------- */

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetMeter = typeof assetMeters.$inferSelect;
export type MeterReading = typeof meterReadings.$inferSelect;
export type AssetDocument = typeof assetDocuments.$inferSelect;
export type AssetTransfer = typeof assetTransfers.$inferSelect;
export type AssetStatusHistory = typeof assetStatusHistory.$inferSelect;
