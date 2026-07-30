import { boolean, index, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdColumns } from './_shared';
import { tenants } from './core';
import { automationRules } from './automatizador';

/**
 * `api_keys` y `api_key_usage` ya existían desde la Fase 1 (`db/schema/core.ts`,
 * "6. API PÚBLICA") como una tabla adelantada a esta fase — igual que los 97
 * permisos y el catálogo de módulos opcionales se sembraron desde el
 * principio. Esta fase los USA (`lib/api-publica/auth.ts`), no los vuelve a
 * declarar: `api_key_usage` es, además, la "bitácora de uso" que pide el
 * prompt maestro (§8) y la base del limitador de tasa (cuenta filas de la
 * última ventana en vez de un contador mutable aparte).
 *
 * Lo único genuinamente nuevo de Fase 12 en materia de integraciones es la
 * bitácora de llamadas salientes a un webhook (acción del Automatizador).
 */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    ruleId: uuid('rule_id').references(() => automationRules.id, { onDelete: 'set null' }),
    url: text('url').notNull(),
    payload: jsonb('payload').notNull(),
    statusCode: integer('status_code'),
    ok: boolean('ok').notNull().default(false),
    error: text('error'),
    ...createdColumns,
  },
  (t) => [index('webhook_deliveries_tenant_idx').on(t.tenantId, t.createdAt)],
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
