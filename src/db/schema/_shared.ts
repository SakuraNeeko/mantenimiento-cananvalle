import { timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Columnas de auditoría transversal (regla de arquitectura §3).
 * Presentes en TODA tabla de negocio salvo las append-only.
 *
 * `createdBy` / `updatedBy` NO llevan FK declarada a `users` para evitar
 * dependencia circular en el módulo núcleo. La integridad se garantiza en la
 * capa de servicios y con una FK añadida por migración manual en Fase 13.
 */
export const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

/** Solo creación: tablas append-only (log, historial, lecturas). */
export const createdColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by'),
};
