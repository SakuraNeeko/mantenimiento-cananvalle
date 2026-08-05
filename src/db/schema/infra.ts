import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { auditColumns } from './_shared';
import {
  characteristicTipoDatoEnum,
  importJobEstadoEnum,
  kardexSignoEnum,
  meterTipoLecturaEnum,
  partyTipoEnum,
} from './enums';
import { sites, tenants, users } from './core';

/**
 * Módulo INFRAESTRUCTURA (Fase 2): ~30 catálogos parametrizables que
 * alimentan Activos, Almacén, Solicitudes, Órdenes y Planes en las fases
 * siguientes. Todos comparten la administración por la pantalla genérica de
 * `src/lib/catalogs/registry.ts`.
 */

/** Forma base de un catálogo simple: código, nombre, descripción, activo. */
export const catalogColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' }),
  codigo: text('codigo').notNull(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  activo: boolean('activo').notNull().default(true),
  ...auditColumns,
};

/** Catálogos "planos": mismas columnas, mismos índices. Evita repetir 14 veces el mismo `pgTable`. */
function simpleCatalog(tableName: string) {
  return pgTable(tableName, { ...catalogColumns }, (t) => [
    uniqueIndex(`${tableName}_codigo_uq`)
      .on(t.tenantId, t.codigo)
      .where(sql`deleted_at IS NULL`),
    index(`${tableName}_tenant_idx`).on(t.tenantId),
  ]);
}

/* -------------------------------------------------------------------------- */
/* 1. CATÁLOGOS PLANOS (14)                                                   */
/* -------------------------------------------------------------------------- */

export const workTypes = simpleCatalog('work_types');
export const assetClasses = simpleCatalog('asset_classes');
export const maintenanceTypes = simpleCatalog('maintenance_types');
export const activityTypes = simpleCatalog('activity_types');
export const otherCostConcepts = simpleCatalog('other_cost_concepts');
export const woPendingCauses = simpleCatalog('wo_pending_causes');
export const woClosingCauses = simpleCatalog('wo_closing_causes');
export const technicalActions = simpleCatalog('technical_actions');
export const failureCauses = simpleCatalog('failure_causes');
export const failureEffects = simpleCatalog('failure_effects');
export const operations = simpleCatalog('operations');
export const taxRegimes = simpleCatalog('tax_regimes');
export const statuses = simpleCatalog('statuses');
export const fuels = simpleCatalog('fuels');
export const wasteTypes = simpleCatalog('waste_types');

/* -------------------------------------------------------------------------- */
/* 2. CATÁLOGOS PLANOS CON 1-3 CAMPOS PROPIOS                                 */
/* -------------------------------------------------------------------------- */

/** Matriz de riesgo: probabilidad × impacto, 1 (bajo) a 5 (alto). */
export const risks = pgTable(
  'risks',
  {
    ...catalogColumns,
    probabilidad: smallint('probabilidad').notNull().default(1),
    impacto: smallint('impacto').notNull().default(1),
  },
  (t) => [
    uniqueIndex('risks_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('risks_tenant_idx').on(t.tenantId),
  ],
);

/** Variables medibles (temperatura, vibración, presión…), asociadas a su unidad de medida. */
export const magnitudes = pgTable(
  'magnitudes',
  {
    ...catalogColumns,
    uomId: uuid('uom_id').references((): AnyPgColumn => uoms.id, { onDelete: 'set null' }),
  },
  (t) => [
    uniqueIndex('magnitudes_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('magnitudes_tenant_idx').on(t.tenantId),
  ],
);

/** Clasificación de riesgo/registro sanitario para equipos biomédicos (Tecnovigilancia, Fase 10). */
export const biomedicalCharacteristics = pgTable(
  'biomedical_characteristics',
  {
    ...catalogColumns,
    riesgo: text('riesgo'),
    clase: text('clase'),
    registroSanitario: text('registro_sanitario'),
    vidaUtilMeses: integer('vida_util_meses'),
  },
  (t) => [
    uniqueIndex('biomedical_characteristics_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('biomedical_characteristics_tenant_idx').on(t.tenantId),
  ],
);

/**
 * La tabla `references` (referencia de repuesto por proveedor) se mudó a
 * `inventory.ts` en la Fase 4, que es cuando por fin puede llevar
 * `material_id` — antes de eso, `materials` no existía y la FK se había
 * dejado pendiente.
 */

/* -------------------------------------------------------------------------- */
/* 3. CATÁLOGOS JERÁRQUICOS                                                   */
/* -------------------------------------------------------------------------- */

export const costCenters = pgTable(
  'cost_centers',
  {
    ...catalogColumns,
    parentId: uuid('parent_id').references((): AnyPgColumn => costCenters.id, { onDelete: 'set null' }),
    codigoContable: text('codigo_contable'),
  },
  (t) => [
    uniqueIndex('cost_centers_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('cost_centers_tenant_idx').on(t.tenantId),
    index('cost_centers_parent_idx').on(t.parentId),
  ],
);

export const responsibleCenters = pgTable(
  'responsible_centers',
  {
    ...catalogColumns,
    parentId: uuid('parent_id').references((): AnyPgColumn => responsibleCenters.id, { onDelete: 'set null' }),
    responsableUserId: uuid('responsable_user_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    uniqueIndex('responsible_centers_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('responsible_centers_tenant_idx').on(t.tenantId),
    index('responsible_centers_parent_idx').on(t.parentId),
  ],
);

/** Ubicaciones físicas: árbol ilimitado (planta → edificio → piso → sala…). */
export const locations = pgTable(
  'locations',
  {
    ...catalogColumns,
    parentId: uuid('parent_id').references((): AnyPgColumn => locations.id, { onDelete: 'set null' }),
    siteId: uuid('site_id').references(() => sites.id, { onDelete: 'set null' }),
    latitud: text('latitud'),
    longitud: text('longitud'),
  },
  (t) => [
    uniqueIndex('locations_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('locations_tenant_idx').on(t.tenantId),
    index('locations_parent_idx').on(t.parentId),
  ],
);

/* -------------------------------------------------------------------------- */
/* 4. CATÁLOGOS CON CAMPOS PROPIOS EXTENSOS                                   */
/* -------------------------------------------------------------------------- */

/** Oficios / cargos técnicos, con su costo hora para valorizar mano de obra en las OT (Fase 6). */
export const trades = pgTable(
  'trades',
  {
    ...catalogColumns,
    costoHoraNormal: numeric('costo_hora_normal', { precision: 18, scale: 4 }).notNull().default('0'),
    costoHoraExtra: numeric('costo_hora_extra', { precision: 18, scale: 4 }).notNull().default('0'),
    costoHoraNocturna: numeric('costo_hora_nocturna', { precision: 18, scale: 4 }).notNull().default('0'),
  },
  (t) => [
    uniqueIndex('trades_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('trades_tenant_idx').on(t.tenantId),
  ],
);

/** Terceros: proveedores, contratistas, fabricantes y clientes. */
export const parties = pgTable(
  'parties',
  {
    ...catalogColumns,
    tipo: partyTipoEnum('tipo').notNull().default('PROVEEDOR'),
    ruc: text('ruc'),
    contactoNombre: text('contacto_nombre'),
    contactoEmail: text('contacto_email'),
    contactoTelefono: text('contacto_telefono'),
    tipoRegimen: text('tipo_regimen'),
  },
  (t) => [
    uniqueIndex('parties_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('parties_tenant_idx').on(t.tenantId),
    index('parties_tipo_idx').on(t.tenantId, t.tipo),
  ],
);

/** Responsables técnicos: puede o no estar vinculado a un usuario del sistema (ej. un contratista externo). */
export const responsibles = pgTable(
  'responsibles',
  {
    ...catalogColumns,
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    tradeId: uuid('trade_id').references(() => trades.id, { onDelete: 'set null' }),
    disponible: boolean('disponible').notNull().default(true),
    costoHora: numeric('costo_hora', { precision: 18, scale: 4 }).notNull().default('0'),
  },
  (t) => [
    uniqueIndex('responsibles_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('responsibles_tenant_idx').on(t.tenantId),
  ],
);

/** Contratos con terceros: vigencia, monto y alcance, con alerta de vencimiento. */
export const contracts = pgTable(
  'contracts',
  {
    ...catalogColumns,
    partyId: uuid('party_id')
      .notNull()
      .references(() => parties.id, { onDelete: 'restrict' }),
    vigenciaInicio: date('vigencia_inicio'),
    vigenciaFin: date('vigencia_fin'),
    monto: numeric('monto', { precision: 18, scale: 4 }),
    alcance: text('alcance'),
    diasAlertaVencimiento: integer('dias_alerta_vencimiento').notNull().default(30),
  },
  (t) => [
    uniqueIndex('contracts_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('contracts_tenant_idx').on(t.tenantId),
    index('contracts_party_idx').on(t.partyId),
  ],
);

/** Almacenes físicos, uno o más por sede. */
export const warehouses = pgTable(
  'warehouses',
  {
    ...catalogColumns,
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'restrict' }),
    responsableUserId: uuid('responsable_user_id').references(() => users.id, { onDelete: 'set null' }),
    permiteNegativos: boolean('permite_negativos').notNull().default(false),
  },
  (t) => [
    uniqueIndex('warehouses_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('warehouses_tenant_idx').on(t.tenantId),
    index('warehouses_site_idx').on(t.siteId),
  ],
);

/** Unidades de medida, con factor de conversión hacia su unidad base (ej. "caja x12" → "unidad"). */
export const uoms = pgTable(
  'uoms',
  {
    ...catalogColumns,
    simbolo: text('simbolo'),
    uomBaseId: uuid('uom_base_id').references((): AnyPgColumn => uoms.id, { onDelete: 'set null' }),
    factorConversion: numeric('factor_conversion', { precision: 18, scale: 6 }).notNull().default('1'),
  },
  (t) => [
    uniqueIndex('uoms_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('uoms_tenant_idx').on(t.tenantId),
  ],
);

/**
 * Monedas activas del tenant (respuesta P-04). La tasa de cambio vive en
 * `currency_rates`, con historial — nunca se sobreescribe una tasa vigente.
 */
export const currencies = pgTable(
  'currencies',
  {
    ...catalogColumns,
    simbolo: text('simbolo'),
  },
  (t) => [
    uniqueIndex('currencies_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('currencies_tenant_idx').on(t.tenantId),
  ],
);

/**
 * Historial de tasas de cambio. Toda conversión busca la tasa vigente a la
 * FECHA DEL DOCUMENTO, nunca la de hoy (P-04).
 * ⚠️ SOLUCIÓN RÁPIDA: el esquema y el catálogo `currencies` ya están listos,
 * pero la pantalla para cargar tasas históricas no se construyó en la Fase 2
 * — no hay todavía ningún documento (Fase 6+) que las consuma. Mientras
 * tanto, `INSERT` directo o `pnpm db:studio`.
 */
export const currencyRates = pgTable(
  'currency_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    currencyId: uuid('currency_id')
      .notNull()
      .references(() => currencies.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),
    tasa: numeric('tasa', { precision: 18, scale: 6 }).notNull(),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('currency_rates_uq').on(t.currencyId, t.fecha),
    index('currency_rates_tenant_idx').on(t.tenantId),
  ],
);

/** Contadores (horómetro, odómetro, ciclos…) que luego se asignan a los activos en la Fase 3. */
export const meters = pgTable(
  'meters',
  {
    ...catalogColumns,
    tipoLectura: meterTipoLecturaEnum('tipo_lectura').notNull().default('HOROMETRO'),
    uomId: uuid('uom_id').references(() => uoms.id, { onDelete: 'set null' }),
    permiteRetroceso: boolean('permite_retroceso').notNull().default(false),
  },
  (t) => [
    uniqueIndex('meters_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('meters_tenant_idx').on(t.tenantId),
  ],
);

/** Plantillas de atributos dinámicos por clase de activo (ficha técnica, Fase 3). */
export const characteristics = pgTable(
  'characteristics',
  {
    ...catalogColumns,
    tipoDato: characteristicTipoDatoEnum('tipo_dato').notNull().default('TEXTO'),
    /** Solo aplica cuando `tipoDato = 'OPCION'`. */
    opciones: jsonb('opciones').$type<string[]>(),
    claseActivo: text('clase_activo'),
  },
  (t) => [
    uniqueIndex('characteristics_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('characteristics_tenant_idx').on(t.tenantId),
  ],
);

/**
 * El catálogo más crítico del módulo: define cada tipo de movimiento de
 * kárdex, su signo, y si exige OT o tercero — el motor de kárdex (Fase 4)
 * se apoya enteramente en estas banderas.
 */
export const kardexConcepts = pgTable(
  'kardex_concepts',
  {
    ...catalogColumns,
    signo: kardexSignoEnum('signo').notNull(),
    exigeOt: boolean('exige_ot').notNull().default(false),
    exigeTercero: boolean('exige_tercero').notNull().default(false),
    afectaCostoPromedio: boolean('afecta_costo_promedio').notNull().default(true),
  },
  (t) => [
    uniqueIndex('kardex_concepts_codigo_uq').on(t.tenantId, t.codigo).where(sql`deleted_at IS NULL`),
    index('kardex_concepts_tenant_idx').on(t.tenantId),
  ],
);

/* -------------------------------------------------------------------------- */
/* 5. IMPORTACIÓN MASIVA (P-05)                                               */
/* -------------------------------------------------------------------------- */

/** Trazabilidad de cada importación Excel: fila por fila, para poder mostrar el resultado exacto. */
export const importJobs = pgTable(
  'import_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    catalogo: text('catalogo').notNull(),
    archivoNombre: text('archivo_nombre').notNull(),
    estado: importJobEstadoEnum('estado').notNull().default('PROCESANDO'),
    totalFilas: integer('total_filas').notNull().default(0),
    filasOk: integer('filas_ok').notNull().default(0),
    filasError: integer('filas_error').notNull().default(0),
    /** `[{ fila: number, error: string }]` — solo las filas que fallaron. */
    errores: jsonb('errores').$type<{ fila: number; error: string }[]>(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    terminadoAt: timestamp('terminado_at', { withTimezone: true }),
  },
  (t) => [
    index('import_jobs_tenant_idx').on(t.tenantId, t.createdAt),
    index('import_jobs_catalogo_idx').on(t.tenantId, t.catalogo),
  ],
);

/* -------------------------------------------------------------------------- */
/* TIPOS INFERIDOS                                                            */
/* -------------------------------------------------------------------------- */

export type CostCenter = typeof costCenters.$inferSelect;
export type ResponsibleCenter = typeof responsibleCenters.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Party = typeof parties.$inferSelect;
export type Responsible = typeof responsibles.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Uom = typeof uoms.$inferSelect;
export type Currency = typeof currencies.$inferSelect;
export type CurrencyRate = typeof currencyRates.$inferSelect;
export type Meter = typeof meters.$inferSelect;
export type Characteristic = typeof characteristics.$inferSelect;
export type KardexConcept = typeof kardexConcepts.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;
