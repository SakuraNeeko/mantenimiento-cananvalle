import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditColumns } from './_shared';
import { adverseEventEstadoEnum, adverseEventSeveridadEnum, adverseEventTipoEnum } from './enums';
import { tenants, users } from './core';
import { assets } from './assets';

/**
 * Módulo TECNOVIGILANCIA (Fase 10, §4.11) — opcional, activable por tenant,
 * orientado a equipos biomédicos. Simplificación documentada: eventos
 * adversos/incidentes propios y alertas de fabricante/recall comparten una
 * sola tabla (`tipo` los distingue) en vez de dos tablas separadas — el
 * ciclo de vida (abierto → en gestión → cerrado) es el mismo para ambos.
 */
export const adverseEvents = pgTable(
  'adverse_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'restrict' }),
    tipo: adverseEventTipoEnum('tipo').notNull().default('EVENTO_ADVERSO'),
    severidad: adverseEventSeveridadEnum('severidad'),
    clasificacion: text('clasificacion'),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    descripcion: text('descripcion').notNull(),
    estado: adverseEventEstadoEnum('estado').notNull().default('ABIERTO'),
    causaRaiz: text('causa_raiz'),
    accionesCorrectivas: text('acciones_correctivas'),
    reportadoAutoridad: boolean('reportado_autoridad').notNull().default(false),
    fechaReporte: timestamp('fecha_reporte', { withTimezone: true }),
    numeroReporte: text('numero_reporte'),
    reportanteUserId: uuid('reportante_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    cerradaAt: timestamp('cerrada_at', { withTimezone: true }),
    cerradaBy: uuid('cerrada_by'),
    ...auditColumns,
  },
  (t) => [index('adverse_events_tenant_idx').on(t.tenantId, t.estado), index('adverse_events_asset_idx').on(t.assetId, t.fecha)],
);

export type AdverseEvent = typeof adverseEvents.$inferSelect;
export type NewAdverseEvent = typeof adverseEvents.$inferInsert;
