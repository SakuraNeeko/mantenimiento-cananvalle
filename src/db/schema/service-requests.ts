import { boolean, index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, createdColumns } from './_shared';
import { priorityEnum, srStatusEnum } from './enums';
import { sites, tenants, users } from './core';
import { locations, workTypes } from './infra';
import { assets } from './assets';

/**
 * Módulo SOLICITUDES DE SERVICIO (Fase 5): la puerta de entrada de cualquier
 * empleado para reportar una falla, sin necesidad de saber nada del resto
 * del sistema — de ahí el portal ligero aparte del módulo interno (§6).
 *
 * Estados (declarados ya en la Fase 1 porque `audit_log` los referencia):
 * BORRADOR → ENVIADA → EN_REVISION → APROBADA/RECHAZADA → ASIGNADA →
 * EN_ATENCION → RESUELTA → CERRADA, con CONVERTIDA_EN_OT como bifurcación.
 *
 * ⚠️ SOLUCIÓN RÁPIDA: la bifurcación a OT no se activa en esta fase —
 * `work_orders` no existe hasta la Fase 6. El estado ya está en el enum
 * (Fase 1) y el permiso `solicitudes.convertir_ot` ya existe, pero no hay
 * botón todavía: no tiene sentido "convertir" a algo que no existe.
 */

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    /** Se asigna con `nextCode(tx, tenantId, 'SS')` al ENVIAR, no al crear — un borrador descartado no gasta consecutivo. */
    consecutivo: text('consecutivo'),
    solicitanteUserId: uuid('solicitante_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
    locationId: uuid('location_id').references(() => locations.id, { onDelete: 'set null' }),
    siteId: uuid('site_id').references(() => sites.id, { onDelete: 'set null' }),
    workTypeId: uuid('work_type_id').references(() => workTypes.id, { onDelete: 'set null' }),
    descripcion: text('descripcion').notNull(),
    prioridad: priorityEnum('prioridad').notNull().default('MEDIA'),
    estado: srStatusEnum('estado').notNull().default('BORRADOR'),
    responsableUserId: uuid('responsable_user_id').references(() => users.id, { onDelete: 'set null' }),
    /** SLA: se calcula al aprobar/asignar según la prioridad; editable a mano. */
    fechaCompromiso: timestamp('fecha_compromiso', { withTimezone: true }),
    fechaAtencion: timestamp('fecha_atencion', { withTimezone: true }),
    solucionAplicada: text('solucion_aplicada'),
    /** Trabajo corto resuelto por un solo responsable, sin generar OT (§4.5). */
    esAtencionDirecta: boolean('es_atencion_directa').notNull().default(false),
    causaRechazo: text('causa_rechazo'),
    calificacion: smallint('calificacion'),
    comentarioCalificacion: text('comentario_calificacion'),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('service_requests_consecutivo_uq').on(t.tenantId, t.consecutivo),
    index('service_requests_tenant_idx').on(t.tenantId, t.fecha),
    index('service_requests_estado_idx').on(t.tenantId, t.estado),
    index('service_requests_solicitante_idx').on(t.solicitanteUserId),
    index('service_requests_responsable_idx').on(t.responsableUserId),
  ],
);

/** Bitácora de seguimiento. `visible_solicitante` filtra qué nota se le muestra al solicitante en el portal. */
export const serviceRequestNotes = pgTable(
  'service_request_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    serviceRequestId: uuid('service_request_id')
      .notNull()
      .references(() => serviceRequests.id, { onDelete: 'cascade' }),
    mensaje: text('mensaje').notNull(),
    visibleSolicitante: boolean('visible_solicitante').notNull().default(true),
    ...createdColumns,
  },
  (t) => [index('service_request_notes_sr_idx').on(t.serviceRequestId, t.createdAt)],
);

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;
export type ServiceRequestNote = typeof serviceRequestNotes.$inferSelect;
