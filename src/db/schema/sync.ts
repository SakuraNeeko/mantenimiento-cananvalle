import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createdColumns } from './_shared';
import { tenants, users } from './core';

/**
 * Módulo PWA móvil offline (Fase 11, §"Experiencia móvil"). El técnico
 * ejecuta checklist, comentarios, fotos y firma sin conexión desde
 * IndexedDB (Dexie); al recuperar señal, la cola se reproduce contra las
 * mismas Server Actions del escritorio.
 *
 * Estrategia de conflicto documentada: "última escritura gana" (§ prompt
 * maestro) — la operación offline SIEMPRE se aplica, nunca se descarta. Esta
 * tabla es solo la bitácora de auditoría de cuándo eso ocurrió sobre un
 * valor que ya había cambiado en el servidor, para que el técnico y su
 * supervisor puedan revisar qué se sobrescribió. No implementa fusión de
 * tres vías: sería sobre-ingeniería para el volumen de conflictos esperado
 * (un mismo checklist normalmente lo trabaja una sola persona).
 */
export const syncConflicts = pgTable(
  'sync_conflicts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    entidad: text('entidad').notNull(),
    entidadId: uuid('entidad_id').notNull(),
    campo: text('campo').notNull(),
    valorServidor: text('valor_servidor'),
    valorCliente: text('valor_cliente'),
    resueltoComo: text('resuelto_como').notNull().default('ULTIMA_ESCRITURA_GANA'),
    workOrderId: uuid('work_order_id'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
    ...createdColumns,
  },
  (t) => [index('sync_conflicts_tenant_idx').on(t.tenantId, t.fecha), index('sync_conflicts_wo_idx').on(t.workOrderId)],
);

export type SyncConflict = typeof syncConflicts.$inferSelect;
export type NewSyncConflict = typeof syncConflicts.$inferInsert;
