CREATE TYPE "public"."downtime_estado" AS ENUM('ABIERTO', 'CERRADO');--> statement-breakpoint
CREATE TYPE "public"."downtime_tipo" AS ENUM('PROGRAMADO', 'NO_PROGRAMADO');--> statement-breakpoint
CREATE TABLE "downtimes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consecutivo" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"tipo" "downtime_tipo" DEFAULT 'NO_PROGRAMADO' NOT NULL,
	"estado" "downtime_estado" DEFAULT 'ABIERTO' NOT NULL,
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_fin" timestamp with time zone,
	"duracion_minutos" numeric(18, 2),
	"causa_falla_id" uuid,
	"efecto_falla_id" uuid,
	"technical_action_id" uuid,
	"impacto_unidades_no_producidas" numeric(18, 2),
	"impacto_costo_estimado" numeric(18, 4),
	"work_order_id" uuid,
	"responsable_reporte_user_id" uuid NOT NULL,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_causa_falla_id_failure_causes_id_fk" FOREIGN KEY ("causa_falla_id") REFERENCES "public"."failure_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_efecto_falla_id_failure_effects_id_fk" FOREIGN KEY ("efecto_falla_id") REFERENCES "public"."failure_effects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_technical_action_id_technical_actions_id_fk" FOREIGN KEY ("technical_action_id") REFERENCES "public"."technical_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downtimes" ADD CONSTRAINT "downtimes_responsable_reporte_user_id_users_id_fk" FOREIGN KEY ("responsable_reporte_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "downtimes_consecutivo_uq" ON "downtimes" USING btree ("tenant_id","consecutivo");--> statement-breakpoint
CREATE INDEX "downtimes_tenant_idx" ON "downtimes" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "downtimes_asset_idx" ON "downtimes" USING btree ("asset_id","fecha_inicio");--> statement-breakpoint
CREATE INDEX "downtimes_wo_idx" ON "downtimes" USING btree ("work_order_id");