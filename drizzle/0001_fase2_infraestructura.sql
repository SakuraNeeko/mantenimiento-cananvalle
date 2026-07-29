CREATE TYPE "public"."characteristic_tipo_dato" AS ENUM('TEXTO', 'NUMERO', 'BOOLEANO', 'FECHA', 'OPCION');--> statement-breakpoint
CREATE TYPE "public"."import_job_estado" AS ENUM('PROCESANDO', 'COMPLETADO', 'CON_ERRORES', 'FALLIDO');--> statement-breakpoint
CREATE TYPE "public"."kardex_signo" AS ENUM('ENTRADA', 'SALIDA');--> statement-breakpoint
CREATE TYPE "public"."meter_tipo_lectura" AS ENUM('HOROMETRO', 'ODOMETRO', 'CICLOS', 'M3', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."party_tipo" AS ENUM('PROVEEDOR', 'CONTRATISTA', 'FABRICANTE', 'CLIENTE');--> statement-breakpoint
CREATE TABLE "activity_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "biomedical_characteristics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"riesgo" text,
	"clase" text,
	"registro_sanitario" text,
	"vida_util_meses" integer
);
--> statement-breakpoint
CREATE TABLE "characteristics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"tipo_dato" characteristic_tipo_dato DEFAULT 'TEXTO' NOT NULL,
	"opciones" jsonb,
	"clase_activo" text
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"party_id" uuid NOT NULL,
	"vigencia_inicio" date,
	"vigencia_fin" date,
	"monto" numeric(18, 4),
	"alcance" text,
	"dias_alerta_vencimiento" integer DEFAULT 30 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"parent_id" uuid,
	"codigo_contable" text
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"simbolo" text
);
--> statement-breakpoint
CREATE TABLE "currency_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"currency_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"tasa" numeric(18, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "failure_causes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "failure_effects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fuels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"catalogo" text NOT NULL,
	"archivo_nombre" text NOT NULL,
	"estado" "import_job_estado" DEFAULT 'PROCESANDO' NOT NULL,
	"total_filas" integer DEFAULT 0 NOT NULL,
	"filas_ok" integer DEFAULT 0 NOT NULL,
	"filas_error" integer DEFAULT 0 NOT NULL,
	"errores" jsonb,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"terminado_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "kardex_concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"signo" "kardex_signo" NOT NULL,
	"exige_ot" boolean DEFAULT false NOT NULL,
	"exige_tercero" boolean DEFAULT false NOT NULL,
	"afecta_costo_promedio" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"parent_id" uuid,
	"site_id" uuid,
	"latitud" text,
	"longitud" text
);
--> statement-breakpoint
CREATE TABLE "magnitudes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"uom_id" uuid
);
--> statement-breakpoint
CREATE TABLE "maintenance_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "meters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"tipo_lectura" "meter_tipo_lectura" DEFAULT 'HOROMETRO' NOT NULL,
	"uom_id" uuid,
	"permite_retroceso" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "other_cost_concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"tipo" "party_tipo" DEFAULT 'PROVEEDOR' NOT NULL,
	"ruc" text,
	"contacto_nombre" text,
	"contacto_email" text,
	"contacto_telefono" text,
	"tipo_regimen" text
);
--> statement-breakpoint
CREATE TABLE "references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"party_id" uuid,
	"codigo_proveedor" text
);
--> statement-breakpoint
CREATE TABLE "responsible_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"parent_id" uuid,
	"responsable_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "responsibles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"user_id" uuid,
	"trade_id" uuid,
	"disponible" boolean DEFAULT true NOT NULL,
	"costo_hora" numeric(18, 4) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"probabilidad" smallint DEFAULT 1 NOT NULL,
	"impacto" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tax_regimes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "technical_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"costo_hora_normal" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_hora_extra" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_hora_nocturna" numeric(18, 4) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uoms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"simbolo" text,
	"uom_base_id" uuid,
	"factor_conversion" numeric(18, 6) DEFAULT '1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"site_id" uuid NOT NULL,
	"responsable_user_id" uuid,
	"permite_negativos" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waste_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wo_closing_causes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wo_pending_causes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "work_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "activity_types" ADD CONSTRAINT "activity_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biomedical_characteristics" ADD CONSTRAINT "biomedical_characteristics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characteristics" ADD CONSTRAINT "characteristics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_parent_id_cost_centers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_rates" ADD CONSTRAINT "currency_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_rates" ADD CONSTRAINT "currency_rates_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_causes" ADD CONSTRAINT "failure_causes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure_effects" ADD CONSTRAINT "failure_effects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuels" ADD CONSTRAINT "fuels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex_concepts" ADD CONSTRAINT "kardex_concepts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magnitudes" ADD CONSTRAINT "magnitudes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magnitudes" ADD CONSTRAINT "magnitudes_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uoms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_types" ADD CONSTRAINT "maintenance_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uoms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "other_cost_concepts" ADD CONSTRAINT "other_cost_concepts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsible_centers" ADD CONSTRAINT "responsible_centers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsible_centers" ADD CONSTRAINT "responsible_centers_parent_id_responsible_centers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."responsible_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsible_centers" ADD CONSTRAINT "responsible_centers_responsable_user_id_users_id_fk" FOREIGN KEY ("responsable_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsibles" ADD CONSTRAINT "responsibles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsibles" ADD CONSTRAINT "responsibles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responsibles" ADD CONSTRAINT "responsibles_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_regimes" ADD CONSTRAINT "tax_regimes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technical_actions" ADD CONSTRAINT "technical_actions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uoms" ADD CONSTRAINT "uoms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uoms" ADD CONSTRAINT "uoms_uom_base_id_uoms_id_fk" FOREIGN KEY ("uom_base_id") REFERENCES "public"."uoms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_responsable_user_id_users_id_fk" FOREIGN KEY ("responsable_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_types" ADD CONSTRAINT "waste_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_closing_causes" ADD CONSTRAINT "wo_closing_causes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_pending_causes" ADD CONSTRAINT "wo_pending_causes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_types" ADD CONSTRAINT "work_types_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_types_codigo_uq" ON "activity_types" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "activity_types_tenant_idx" ON "activity_types" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "biomedical_characteristics_codigo_uq" ON "biomedical_characteristics" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "biomedical_characteristics_tenant_idx" ON "biomedical_characteristics" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "characteristics_codigo_uq" ON "characteristics" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "characteristics_tenant_idx" ON "characteristics" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contracts_codigo_uq" ON "contracts" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "contracts_tenant_idx" ON "contracts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contracts_party_idx" ON "contracts" USING btree ("party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cost_centers_codigo_uq" ON "cost_centers" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "cost_centers_tenant_idx" ON "cost_centers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cost_centers_parent_idx" ON "cost_centers" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "currencies_codigo_uq" ON "currencies" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "currencies_tenant_idx" ON "currencies" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "currency_rates_uq" ON "currency_rates" USING btree ("currency_id","fecha");--> statement-breakpoint
CREATE INDEX "currency_rates_tenant_idx" ON "currency_rates" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "failure_causes_codigo_uq" ON "failure_causes" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "failure_causes_tenant_idx" ON "failure_causes" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "failure_effects_codigo_uq" ON "failure_effects" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "failure_effects_tenant_idx" ON "failure_effects" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fuels_codigo_uq" ON "fuels" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "fuels_tenant_idx" ON "fuels" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "import_jobs_tenant_idx" ON "import_jobs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "import_jobs_catalogo_idx" ON "import_jobs" USING btree ("tenant_id","catalogo");--> statement-breakpoint
CREATE UNIQUE INDEX "kardex_concepts_codigo_uq" ON "kardex_concepts" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "kardex_concepts_tenant_idx" ON "kardex_concepts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_codigo_uq" ON "locations" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "locations_tenant_idx" ON "locations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "magnitudes_codigo_uq" ON "magnitudes" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "magnitudes_tenant_idx" ON "magnitudes" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_types_codigo_uq" ON "maintenance_types" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "maintenance_types_tenant_idx" ON "maintenance_types" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meters_codigo_uq" ON "meters" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "meters_tenant_idx" ON "meters" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "operations_codigo_uq" ON "operations" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "operations_tenant_idx" ON "operations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "other_cost_concepts_codigo_uq" ON "other_cost_concepts" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "other_cost_concepts_tenant_idx" ON "other_cost_concepts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parties_codigo_uq" ON "parties" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "parties_tenant_idx" ON "parties" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "parties_tipo_idx" ON "parties" USING btree ("tenant_id","tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "references_codigo_uq" ON "references" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "references_tenant_idx" ON "references" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responsible_centers_codigo_uq" ON "responsible_centers" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "responsible_centers_tenant_idx" ON "responsible_centers" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "responsible_centers_parent_idx" ON "responsible_centers" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responsibles_codigo_uq" ON "responsibles" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "responsibles_tenant_idx" ON "responsibles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "risks_codigo_uq" ON "risks" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "risks_tenant_idx" ON "risks" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "statuses_codigo_uq" ON "statuses" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "statuses_tenant_idx" ON "statuses" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_regimes_codigo_uq" ON "tax_regimes" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "tax_regimes_tenant_idx" ON "tax_regimes" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "technical_actions_codigo_uq" ON "technical_actions" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "technical_actions_tenant_idx" ON "technical_actions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trades_codigo_uq" ON "trades" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "trades_tenant_idx" ON "trades" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uoms_codigo_uq" ON "uoms" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "uoms_tenant_idx" ON "uoms" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_codigo_uq" ON "warehouses" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "warehouses_tenant_idx" ON "warehouses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "warehouses_site_idx" ON "warehouses" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "waste_types_codigo_uq" ON "waste_types" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "waste_types_tenant_idx" ON "waste_types" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wo_closing_causes_codigo_uq" ON "wo_closing_causes" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "wo_closing_causes_tenant_idx" ON "wo_closing_causes" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wo_pending_causes_codigo_uq" ON "wo_pending_causes" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "wo_pending_causes_tenant_idx" ON "wo_pending_causes" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_types_codigo_uq" ON "work_types" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "work_types_tenant_idx" ON "work_types" USING btree ("tenant_id");