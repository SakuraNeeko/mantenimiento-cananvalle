CREATE TYPE "public"."plan_alcance" AS ENUM('ACTIVO_UNICO', 'GRUPO');--> statement-breakpoint
CREATE TYPE "public"."plan_generation_resultado" AS ENUM('GENERADA', 'OMITIDA_DUPLICADO', 'OMITIDA_SIN_PROYECCION', 'OMITIDA_INACTIVO', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."plan_intervalo_unidad" AS ENUM('DIAS', 'SEMANAS', 'MESES', 'ANIOS');--> statement-breakpoint
CREATE TYPE "public"."plan_reprogramacion_modo" AS ENUM('FIJO', 'FLOTANTE');--> statement-breakpoint
CREATE TYPE "public"."plan_resource_tipo" AS ENUM('MANO_OBRA', 'MATERIAL');--> statement-breakpoint
CREATE TYPE "public"."plan_trigger_tipo" AS ENUM('CALENDARIO', 'CONTADOR', 'CONDICION', 'EVENTO');--> statement-breakpoint
CREATE TABLE "maintenance_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"maintenance_type_id" uuid,
	"work_type_id" uuid,
	"alcance" "plan_alcance" DEFAULT 'ACTIVO_UNICO' NOT NULL,
	"asset_id" uuid,
	"clase_filtro" "asset_clase",
	"criticidad_filtro" "criticality",
	"location_filtro" uuid,
	"responsible_default_id" uuid,
	"prioridad" "priority" DEFAULT 'MEDIA' NOT NULL,
	"tiempo_estimado_horas" numeric(10, 2),
	"instrucciones" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plan_generation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"trigger_id" uuid,
	"asset_id" uuid,
	"work_order_id" uuid,
	"resultado" "plan_generation_resultado" NOT NULL,
	"fecha_proyectada" timestamp with time zone,
	"lectura_medidor" numeric(18, 4),
	"detalle" text,
	"fecha_evaluacion" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "plan_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"tipo" "plan_resource_tipo" NOT NULL,
	"trade_id" uuid,
	"horas_estimadas" numeric(10, 2),
	"material_id" uuid,
	"cantidad_estimada" numeric(18, 4),
	"costo_estimado" numeric(18, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "plan_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"orden" integer DEFAULT 1 NOT NULL,
	"descripcion" text NOT NULL,
	"tipo_respuesta" "wo_task_tipo_respuesta" DEFAULT 'OK_NO_OK' NOT NULL,
	"es_critica" boolean DEFAULT false NOT NULL,
	"trade_id" uuid,
	"duracion_minutos" integer,
	"instrucciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "plan_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"tipo" "plan_trigger_tipo" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"modo_reprogramacion" "plan_reprogramacion_modo" DEFAULT 'FIJO' NOT NULL,
	"dias_anticipacion" integer DEFAULT 0 NOT NULL,
	"intervalo_valor" integer,
	"intervalo_unidad" "plan_intervalo_unidad",
	"fecha_base" date,
	"meter_id" uuid,
	"intervalo_contador" numeric(18, 4),
	"umbral_aviso" numeric(18, 4),
	"magnitud_id" uuid,
	"rango_min" numeric(18, 4),
	"rango_max" numeric(18, 4),
	"evento_descripcion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_maintenance_type_id_maintenance_types_id_fk" FOREIGN KEY ("maintenance_type_id") REFERENCES "public"."maintenance_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_location_filtro_locations_id_fk" FOREIGN KEY ("location_filtro") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_responsible_default_id_responsibles_id_fk" FOREIGN KEY ("responsible_default_id") REFERENCES "public"."responsibles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_generation_log" ADD CONSTRAINT "plan_generation_log_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_generation_log" ADD CONSTRAINT "plan_generation_log_trigger_id_plan_triggers_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."plan_triggers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_generation_log" ADD CONSTRAINT "plan_generation_log_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_generation_log" ADD CONSTRAINT "plan_generation_log_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_resources" ADD CONSTRAINT "plan_resources_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_resources" ADD CONSTRAINT "plan_resources_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_resources" ADD CONSTRAINT "plan_resources_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_triggers" ADD CONSTRAINT "plan_triggers_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_triggers" ADD CONSTRAINT "plan_triggers_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_triggers" ADD CONSTRAINT "plan_triggers_magnitud_id_magnitudes_id_fk" FOREIGN KEY ("magnitud_id") REFERENCES "public"."magnitudes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_plans_codigo_uq" ON "maintenance_plans" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "maintenance_plans_tenant_idx" ON "maintenance_plans" USING btree ("tenant_id","activo");--> statement-breakpoint
CREATE INDEX "maintenance_plans_asset_idx" ON "maintenance_plans" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "plan_generation_log_plan_idx" ON "plan_generation_log" USING btree ("plan_id","fecha_evaluacion");--> statement-breakpoint
CREATE INDEX "plan_generation_log_asset_idx" ON "plan_generation_log" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "plan_resources_plan_idx" ON "plan_resources" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_tasks_plan_idx" ON "plan_tasks" USING btree ("plan_id","orden");--> statement-breakpoint
CREATE INDEX "plan_triggers_plan_idx" ON "plan_triggers" USING btree ("plan_id");