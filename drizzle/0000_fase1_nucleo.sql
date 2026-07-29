CREATE TYPE "public"."audit_action" AS ENUM('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT');--> statement-breakpoint
CREATE TYPE "public"."audit_level" AS ENUM('INFO', 'CRITICO');--> statement-breakpoint
CREATE TYPE "public"."criticality" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('IN_APP', 'EMAIL', 'AMBOS', 'NINGUNO');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('BAJA', 'MEDIA', 'ALTA', 'URGENTE');--> statement-breakpoint
CREATE TYPE "public"."scope" AS ENUM('PROPIO', 'SEDE', 'TENANT');--> statement-breakpoint
CREATE TYPE "public"."sr_status" AS ENUM('BORRADOR', 'ENVIADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'ASIGNADA', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'CONVERTIDA_EN_OT');--> statement-breakpoint
CREATE TYPE "public"."wo_status" AS ENUM('BORRADOR', 'PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'PENDIENTE', 'EJECUTADA', 'LIQUIDADA', 'CERRADA', 'EN_HISTORIA', 'CANCELADA');--> statement-breakpoint
CREATE TABLE "api_key_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"api_key_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"metodo" text NOT NULL,
	"status_code" smallint NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"hash" text NOT NULL,
	"prefijo" text NOT NULL,
	"permisos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expira_at" timestamp with time zone,
	"revocada_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"blob_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" uuid,
	"accion" "audit_action" NOT NULL,
	"nivel" "audit_level" DEFAULT 'INFO' NOT NULL,
	"permiso" text,
	"diff" jsonb,
	"user_id" uuid,
	"user_email" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"exitoso" boolean NOT NULL,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"canal" "notification_channel" DEFAULT 'IN_APP' NOT NULL,
	CONSTRAINT "notification_preferences_user_id_tipo_pk" PRIMARY KEY("user_id","tipo")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"cuerpo" text,
	"link" text,
	"entidad" text,
	"entidad_id" uuid,
	"leida_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expira_at" timestamp with time zone NOT NULL,
	"usado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"codigo" text PRIMARY KEY NOT NULL,
	"modulo" text NOT NULL,
	"descripcion" text NOT NULL,
	"es_sensible" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_code" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_code_pk" PRIMARY KEY("role_id","permission_code")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"es_sistema" boolean DEFAULT false NOT NULL,
	"scope_default" "scope" DEFAULT 'SEDE' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"modulo" text NOT NULL,
	"nombre" text NOT NULL,
	"definicion" jsonb NOT NULL,
	"compartida" boolean DEFAULT false NOT NULL,
	"es_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"documento" text NOT NULL,
	"mascara" text NOT NULL,
	"valor_actual" integer DEFAULT 0 NOT NULL,
	"anio" integer NOT NULL,
	"reinicia_anual" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"direccion" text,
	"latitud" text,
	"longitud" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tenant_modules" (
	"tenant_id" uuid NOT NULL,
	"modulo" text NOT NULL,
	"habilitado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tenant_modules_tenant_id_modulo_pk" PRIMARY KEY("tenant_id","modulo")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"razon_social" text NOT NULL,
	"ruc" text,
	"logo_url" text,
	"moneda_base" char(3) DEFAULT 'USD' NOT NULL,
	"timezone" text DEFAULT 'America/Guayaquil' NOT NULL,
	"locale" text DEFAULT 'es-EC' NOT NULL,
	"parametros" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"scope" "scope" DEFAULT 'SEDE' NOT NULL,
	"site_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "user_site_access" (
	"user_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "user_site_access_user_id_site_id_pk" PRIMARY KEY("user_id","site_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"nombre" text NOT NULL,
	"cargo" text,
	"telefono" text,
	"foto_url" text,
	"site_default_id" uuid,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_secret" text,
	"token_version" integer DEFAULT 0 NOT NULL,
	"password_changed_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api_key_usage" ADD CONSTRAINT "api_key_usage_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_code_permissions_codigo_fk" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("codigo") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_modules" ADD CONSTRAINT "tenant_modules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_access" ADD CONSTRAINT "user_site_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_site_access" ADD CONSTRAINT "user_site_access_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_site_default_id_sites_id_fk" FOREIGN KEY ("site_default_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_usage_key_idx" ON "api_key_usage" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_prefijo_uq" ON "api_keys" USING btree ("prefijo");--> statement-breakpoint
CREATE INDEX "attachments_entidad_idx" ON "attachments" USING btree ("tenant_id","entidad","entidad_id");--> statement-breakpoint
CREATE INDEX "audit_entidad_idx" ON "audit_log" USING btree ("tenant_id","entidad","entidad_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_log" USING btree ("tenant_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_nivel_idx" ON "audit_log" USING btree ("tenant_id","nivel","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_idx" ON "login_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","leida_at","created_at");--> statement-breakpoint
CREATE INDEX "prt_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prt_token_uq" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "permissions_modulo_idx" ON "permissions" USING btree ("modulo");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_codigo_uq" ON "roles" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "saved_views_user_idx" ON "saved_views" USING btree ("user_id","modulo");--> statement-breakpoint
CREATE UNIQUE INDEX "sequences_doc_uq" ON "sequences" USING btree ("tenant_id","documento");--> statement-breakpoint
CREATE UNIQUE INDEX "sites_codigo_uq" ON "sites" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "sites_tenant_idx" ON "sites" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_codigo_uq" ON "tenants" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("tenant_id","email") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");