import { relations, sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  char,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns, createdColumns } from './_shared';
import { auditActionEnum, auditLevelEnum, notificationChannelEnum, scopeEnum } from './enums';

/* -------------------------------------------------------------------------- */
/* 1. TENANTS Y SEDES                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Decisión D-03 revisada (respuesta P-01: instancia única, una empresa, varias sedes).
 * Se CONSERVA `tenant_id` en todas las tablas de negocio —cuesta una columna y un
 * índice— pero la aplicación resuelve un único tenant desde `getCurrentTenant()`.
 * No hay selector de tenant, ni rol SOPORTE, ni pantallas de aprovisionamiento.
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: text('codigo').notNull(),
    razonSocial: text('razon_social').notNull(),
    ruc: text('ruc'),
    logoUrl: text('logo_url'),
    monedaBase: char('moneda_base', { length: 3 }).notNull().default('USD'),
    timezone: text('timezone').notNull().default('America/Guayaquil'),
    locale: text('locale').notNull().default('es-EC'),
    /** Parámetros operativos: política de claves, minutos de inactividad, etc. */
    parametros: jsonb('parametros').$type<TenantParams>().notNull().default(sql`'{}'::jsonb`),
    activo: boolean('activo').notNull().default(true),
    ...auditColumns,
  },
  (t) => [uniqueIndex('tenants_codigo_uq').on(t.codigo)],
);

export type TenantParams = {
  passwordMinLength?: number;
  passwordRequireSymbol?: boolean;
  passwordExpiryDays?: number;
  sessionIdleMinutes?: number;
  maxLoginAttempts?: number;
  lockoutMinutes?: number;
};

export const sites = pgTable(
  'sites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    direccion: text('direccion'),
    latitud: text('latitud'),
    longitud: text('longitud'),
    activo: boolean('activo').notNull().default(true),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('sites_codigo_uq')
      .on(t.tenantId, t.codigo)
      .where(sql`deleted_at IS NULL`),
    index('sites_tenant_idx').on(t.tenantId),
  ],
);

/** Activación de módulos opcionales por tenant (combustibles, tecnovigilancia, automatizador). */
export const tenantModules = pgTable(
  'tenant_modules',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    modulo: text('modulo').notNull(),
    habilitado: boolean('habilitado').notNull().default(false),
    ...auditColumns,
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.modulo] })],
);

/* -------------------------------------------------------------------------- */
/* 2. USUARIOS                                                                */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    nombre: text('nombre').notNull(),
    cargo: text('cargo'),
    telefono: text('telefono'),
    fotoUrl: text('foto_url'),
    siteDefaultId: uuid('site_default_id').references(() => sites.id, { onDelete: 'set null' }),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    mfaSecret: text('mfa_secret'),
    /**
     * D-07: "cerrar sesión en todos los dispositivos" sin tabla de sesiones.
     * Al invalidar se incrementa y todo JWT con versión anterior se rechaza.
     */
    tokenVersion: integer('token_version').notNull().default(0),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    activo: boolean('activo').notNull().default(true),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('users_email_uq')
      .on(t.tenantId, t.email)
      .where(sql`deleted_at IS NULL`),
    index('users_tenant_idx').on(t.tenantId),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiraAt: timestamp('expira_at', { withTimezone: true }).notNull(),
    usadoAt: timestamp('usado_at', { withTimezone: true }),
    ...createdColumns,
  },
  (t) => [index('prt_user_idx').on(t.userId), uniqueIndex('prt_token_uq').on(t.tokenHash)],
);

/** Base del rate limiting y del bloqueo por intentos fallidos. Append-only. */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    email: text('email').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    exitoso: boolean('exitoso').notNull(),
    motivo: text('motivo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_attempts_email_idx').on(t.email, t.createdAt), index('login_attempts_ip_idx').on(t.ip, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* 3. RBAC                                                                    */
/* -------------------------------------------------------------------------- */

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'restrict' }),
    codigo: text('codigo').notNull(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    /** Los 8 roles predefinidos no se pueden eliminar ni renombrar su código. */
    esSistema: boolean('es_sistema').notNull().default(false),
    scopeDefault: scopeEnum('scope_default').notNull().default('SEDE'),
    activo: boolean('activo').notNull().default(true),
    ...auditColumns,
  },
  (t) => [
    uniqueIndex('roles_codigo_uq')
      .on(t.tenantId, t.codigo)
      .where(sql`deleted_at IS NULL`),
  ],
);

/**
 * Catálogo GLOBAL de permisos: no lleva tenant_id.
 * Se sincroniza desde `src/lib/permissions/catalog.ts` en cada seed/deploy.
 */
export const permissions = pgTable(
  'permissions',
  {
    codigo: text('codigo').primaryKey(),
    modulo: text('modulo').notNull(),
    descripcion: text('descripcion').notNull(),
    /** 🔒 Exige re-confirmación en la UI y escribe audit_log con nivel CRITICO. */
    esSensible: boolean('es_sensible').notNull().default(false),
  },
  (t) => [index('permissions_modulo_idx').on(t.modulo)],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionCode: text('permission_code')
      .notNull()
      .references(() => permissions.codigo, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionCode] })],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    /** Alcance efectivo de esta asignación. Sobrescribe `roles.scopeDefault`. */
    scope: scopeEnum('scope').notNull().default('SEDE'),
    /** Si scope = SEDE y se indica, limita a esa sede concreta. */
    siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    ...createdColumns,
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] }), index('user_roles_role_idx').on(t.roleId)],
);

export const userSiteAccess = pgTable(
  'user_site_access',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    siteId: uuid('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    ...createdColumns,
  },
  (t) => [primaryKey({ columns: [t.userId, t.siteId] })],
);

/* -------------------------------------------------------------------------- */
/* 4. CONSECUTIVOS                                                            */
/* -------------------------------------------------------------------------- */

/**
 * D-08: no se usan SEQUENCE de PostgreSQL porque necesitamos máscara
 * configurable y reinicio anual por tenant. Se toma con SELECT ... FOR UPDATE
 * dentro de la misma transacción que inserta el documento.
 */
export const sequences = pgTable(
  'sequences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** OT | SS | PA | KX | IF | OC | SC */
    documento: text('documento').notNull(),
    /** Ej. "OT-{YYYY}-{######}" */
    mascara: text('mascara').notNull(),
    valorActual: integer('valor_actual').notNull().default(0),
    anio: integer('anio').notNull(),
    reiniciaAnual: boolean('reinicia_anual').notNull().default(true),
    ...auditColumns,
  },
  (t) => [uniqueIndex('sequences_doc_uq').on(t.tenantId, t.documento)],
);

/* -------------------------------------------------------------------------- */
/* 5. AUDITORÍA, NOTIFICACIONES, ADJUNTOS, VISTAS                             */
/* -------------------------------------------------------------------------- */

export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    entidad: text('entidad').notNull(),
    entidadId: uuid('entidad_id'),
    accion: auditActionEnum('accion').notNull(),
    nivel: auditLevelEnum('nivel').notNull().default('INFO'),
    /** Permiso 🔒 que autorizó la acción, cuando aplica. */
    permiso: text('permiso'),
    /** Diff { campo: { antes, despues } } */
    diff: jsonb('diff'),
    userId: uuid('user_id'),
    userEmail: text('user_email'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_entidad_idx').on(t.tenantId, t.entidad, t.entidadId, t.createdAt),
    index('audit_user_idx').on(t.tenantId, t.userId, t.createdAt),
    index('audit_nivel_idx').on(t.tenantId, t.nivel, t.createdAt),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    cuerpo: text('cuerpo'),
    link: text('link'),
    entidad: text('entidad'),
    entidadId: uuid('entidad_id'),
    leidaAt: timestamp('leida_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.leidaAt, t.createdAt)],
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    canal: notificationChannelEnum('canal').notNull().default('IN_APP'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tipo] })],
);

/** Adjuntos polimórficos: `entidad` + `entidadId`. Sin FK por diseño. */
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    entidad: text('entidad').notNull(),
    entidadId: uuid('entidad_id').notNull(),
    nombre: text('nombre').notNull(),
    blobUrl: text('blob_url').notNull(),
    mimeType: text('mime_type').notNull(),
    bytes: integer('bytes').notNull(),
    ...auditColumns,
  },
  (t) => [index('attachments_entidad_idx').on(t.tenantId, t.entidad, t.entidadId)],
);

/** Vistas guardadas de la tabla genérica: filtros, orden, columnas visibles. */
export const savedViews = pgTable(
  'saved_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    modulo: text('modulo').notNull(),
    nombre: text('nombre').notNull(),
    definicion: jsonb('definicion').notNull(),
    compartida: boolean('compartida').notNull().default(false),
    esDefault: boolean('es_default').notNull().default(false),
    ...auditColumns,
  },
  (t) => [index('saved_views_user_idx').on(t.userId, t.modulo)],
);

/* -------------------------------------------------------------------------- */
/* 6. API PÚBLICA                                                             */
/* -------------------------------------------------------------------------- */

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    /** Solo se guarda el hash. El valor en claro se muestra una única vez. */
    hash: text('hash').notNull(),
    prefijo: text('prefijo').notNull(),
    permisos: jsonb('permisos').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    expiraAt: timestamp('expira_at', { withTimezone: true }),
    revocadaAt: timestamp('revocada_at', { withTimezone: true }),
    ...auditColumns,
  },
  (t) => [uniqueIndex('api_keys_prefijo_uq').on(t.prefijo)],
);

export const apiKeyUsage = pgTable(
  'api_key_usage',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    apiKeyId: uuid('api_key_id')
      .notNull()
      .references(() => apiKeys.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    metodo: text('metodo').notNull(),
    statusCode: smallint('status_code').notNull(),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('api_key_usage_key_idx').on(t.apiKeyId, t.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* RELACIONES                                                                 */
/* -------------------------------------------------------------------------- */

export const tenantsRelations = relations(tenants, ({ many }) => ({
  sites: many(sites),
  users: many(users),
  roles: many(roles),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  siteDefault: one(sites, { fields: [users.siteDefaultId], references: [sites.id] }),
  userRoles: many(userRoles),
  siteAccess: many(userSiteAccess),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionCode],
    references: [permissions.codigo],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
  site: one(sites, { fields: [userRoles.siteId], references: [sites.id] }),
}));

export const userSiteAccessRelations = relations(userSiteAccess, ({ one }) => ({
  user: one(users, { fields: [userSiteAccess.userId], references: [users.id] }),
  site: one(sites, { fields: [userSiteAccess.siteId], references: [sites.id] }),
}));

/* -------------------------------------------------------------------------- */
/* TIPOS INFERIDOS                                                            */
/* -------------------------------------------------------------------------- */

export type Tenant = typeof tenants.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type Scope = (typeof scopeEnum.enumValues)[number];
