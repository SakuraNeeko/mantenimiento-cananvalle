CREATE TYPE "public"."periodo_tipo" AS ENUM('MES', 'TRIMESTRE', 'ANIO');--> statement-breakpoint
CREATE TABLE "archived_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"consecutivo" text NOT NULL,
	"origen" text NOT NULL,
	"asset_id" uuid,
	"asset_codigo" text,
	"asset_nombre" text,
	"maintenance_type_nombre" text,
	"cost_center_id" uuid,
	"cost_center_nombre" text,
	"prioridad" text NOT NULL,
	"criticidad" text NOT NULL,
	"descripcion_problema" text NOT NULL,
	"causa_falla_nombre" text,
	"efecto_falla_nombre" text,
	"causa_cierre_nombre" text,
	"fecha_creacion" timestamp with time zone NOT NULL,
	"fecha_programada" timestamp with time zone,
	"fecha_inicio_real" timestamp with time zone,
	"fecha_fin_real" timestamp with time zone,
	"cerrada_at" timestamp with time zone,
	"costo_mano_obra" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_materiales" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_terceros" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_otros" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tiempo_estimado_horas" numeric(10, 2),
	"snapshot" jsonb NOT NULL,
	"enviada_historia_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enviada_historia_by" uuid,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_by" uuid
);
--> statement-breakpoint
CREATE TABLE "periodic_balance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo" "periodo_tipo" NOT NULL,
	"anio" integer NOT NULL,
	"numero" integer DEFAULT 0 NOT NULL,
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_fin" timestamp with time zone NOT NULL,
	"costo_mano_obra" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_materiales" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_terceros" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_otros" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"ot_cerradas" integer DEFAULT 0 NOT NULL,
	"ot_preventivas" integer DEFAULT 0 NOT NULL,
	"ot_correctivas" integer DEFAULT 0 NOT NULL,
	"cumplimiento_plan" numeric(6, 2),
	"indice_preventivo" numeric(6, 2),
	"mtbf_horas" numeric(18, 2),
	"mttr_horas" numeric(18, 2),
	"disponibilidad" numeric(6, 2),
	"cumplimiento_sla" numeric(6, 2),
	"desglose" jsonb NOT NULL,
	"calculado_at" timestamp with time zone DEFAULT now() NOT NULL,
	"calculado_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wo_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"work_order_id" uuid NOT NULL,
	"consecutivo" text NOT NULL,
	"origen" text NOT NULL,
	"asset_id" uuid,
	"asset_codigo" text,
	"asset_nombre" text,
	"maintenance_type_nombre" text,
	"cost_center_id" uuid,
	"cost_center_nombre" text,
	"prioridad" text NOT NULL,
	"criticidad" text NOT NULL,
	"descripcion_problema" text NOT NULL,
	"causa_falla_nombre" text,
	"efecto_falla_nombre" text,
	"causa_cierre_nombre" text,
	"fecha_creacion" timestamp with time zone NOT NULL,
	"fecha_programada" timestamp with time zone,
	"fecha_inicio_real" timestamp with time zone,
	"fecha_fin_real" timestamp with time zone,
	"cerrada_at" timestamp with time zone,
	"costo_mano_obra" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_materiales" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_terceros" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_otros" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tiempo_estimado_horas" numeric(10, 2),
	"snapshot" jsonb NOT NULL,
	"enviada_historia_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enviada_historia_by" uuid
);
--> statement-breakpoint
ALTER TABLE "archived_history" ADD CONSTRAINT "archived_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periodic_balance" ADD CONSTRAINT "periodic_balance_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_history" ADD CONSTRAINT "wo_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "archived_history_work_order_uq" ON "archived_history" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "archived_history_tenant_idx" ON "archived_history" USING btree ("tenant_id","fecha_fin_real");--> statement-breakpoint
CREATE INDEX "archived_history_asset_idx" ON "archived_history" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "periodic_balance_periodo_uq" ON "periodic_balance" USING btree ("tenant_id","tipo","anio","numero");--> statement-breakpoint
CREATE INDEX "periodic_balance_tenant_idx" ON "periodic_balance" USING btree ("tenant_id","fecha_inicio");--> statement-breakpoint
CREATE UNIQUE INDEX "wo_history_work_order_uq" ON "wo_history" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "wo_history_tenant_idx" ON "wo_history" USING btree ("tenant_id","fecha_fin_real");--> statement-breakpoint
CREATE INDEX "wo_history_asset_idx" ON "wo_history" USING btree ("asset_id");