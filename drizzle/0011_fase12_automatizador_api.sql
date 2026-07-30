CREATE TYPE "public"."automation_disparador" AS ENUM('OT_CREADA', 'OT_CAMBIO_ESTADO', 'SS_CREADA', 'MEDIDOR_FUERA_RANGO', 'STOCK_BAJO_MINIMO', 'OT_VENCIDA', 'CONTRATO_POR_VENCER', 'PARO_EXCEDE_HORAS');--> statement-breakpoint
CREATE TYPE "public"."automation_resultado" AS ENUM('EJECUTADA', 'ERROR');--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"disparador_tipo" "automation_disparador" NOT NULL,
	"umbral" integer,
	"condiciones" jsonb DEFAULT '{"operador":"AND","reglas":[]}' NOT NULL,
	"acciones" jsonb DEFAULT '[]' NOT NULL,
	"ultima_evaluacion_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" uuid NOT NULL,
	"clave_dedupe" text NOT NULL,
	"resultado" "automation_resultado" NOT NULL,
	"detalle" jsonb,
	"duracion_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_id" uuid,
	"url" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status_code" integer,
	"ok" boolean DEFAULT false NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "asset_meters" ADD COLUMN "rango_min" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "asset_meters" ADD COLUMN "rango_max" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_rules_tenant_idx" ON "automation_rules" USING btree ("tenant_id","activo","disparador_tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_runs_dedupe_uq" ON "automation_runs" USING btree ("rule_id","clave_dedupe");--> statement-breakpoint
CREATE INDEX "automation_runs_tenant_idx" ON "automation_runs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_tenant_idx" ON "webhook_deliveries" USING btree ("tenant_id","created_at");