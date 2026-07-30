import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, createdColumns } from './_shared';
import { automationDisparadorEnum, automationResultadoEnum } from './enums';
import { tenants } from './core';

/**
 * Módulo AUTOMATIZADOR (Fase 12, §4.12) — motor de reglas disparador →
 * condiciones → acciones, sin necesidad de código. `condiciones` y `acciones`
 * son jsonb porque su forma depende del `disparadorTipo` elegido (el campo
 * "Prioridad" tiene sentido para una OT pero no para un contrato) — una
 * tabla de columnas fijas habría necesitado una fila de excepciones por cada
 * combinación posible. La validación de esa forma vive en
 * `lib/automatizador/motor.ts`, no en la base de datos.
 */
export const automationRules = pgTable(
  'automation_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    activo: boolean('activo').notNull().default(true),
    disparadorTipo: automationDisparadorEnum('disparador_tipo').notNull(),
    /** Umbral numérico genérico para los disparadores que lo necesitan (horas de un paro, días de anticipación de un contrato). Los demás lo ignoran. */
    umbral: integer('umbral'),
    /** `{ operador: 'AND'|'OR', reglas: [{ campo, operador, valor }] }` — ver `lib/automatizador/motor.ts`. */
    condiciones: jsonb('condiciones').notNull().default('{"operador":"AND","reglas":[]}'),
    /** `[{ tipo, parametros }]` — ver `lib/automatizador/motor.ts`. */
    acciones: jsonb('acciones').notNull().default('[]'),
    ultimaEvaluacionAt: timestamp('ultima_evaluacion_at', { withTimezone: true }),
    ...auditColumns,
  },
  (t) => [index('automation_rules_tenant_idx').on(t.tenantId, t.activo, t.disparadorTipo)],
);

/**
 * Bitácora de ejecución (§4.12: "para depuración"). Una fila por combinación
 * (regla, evento disparador) que SÍ cumplió condiciones y disparó acciones —
 * también sirve de deduplicación.
 *
 * `entidadId` es el id real de la fila que disparó (para poder enlazar
 * desde la bitácora hacia la OT/SS/paro/contrato en cuestión). `claveDedupe`
 * es lo que en verdad evita repetir: para disparadores de EVENTO (se creó
 * algo, cambió de estado) es el mismo `entidadId` — el evento ocurre una
 * sola vez. Para disparadores de NIVEL (stock bajo mínimo, OT vencida,
 * contrato por vencer, paro que excede horas, medidor fuera de rango) es
 * `entidadId + fecha del día` — la condición sigue siendo cierta día tras
 * día, y se quiere volver a avisar una vez por día, no una única vez para
 * siempre.
 */
export const automationRuns = pgTable(
  'automation_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    ruleId: uuid('rule_id')
      .notNull()
      .references(() => automationRules.id, { onDelete: 'cascade' }),
    entidad: text('entidad').notNull(),
    entidadId: uuid('entidad_id').notNull(),
    claveDedupe: text('clave_dedupe').notNull(),
    resultado: automationResultadoEnum('resultado').notNull(),
    detalle: jsonb('detalle'),
    duracionMs: integer('duracion_ms'),
    ...createdColumns,
  },
  (t) => [
    uniqueIndex('automation_runs_dedupe_uq').on(t.ruleId, t.claveDedupe),
    index('automation_runs_tenant_idx').on(t.tenantId, t.createdAt),
  ],
);

export type AutomationRule = typeof automationRules.$inferSelect;
export type NewAutomationRule = typeof automationRules.$inferInsert;
export type AutomationRun = typeof automationRuns.$inferSelect;
