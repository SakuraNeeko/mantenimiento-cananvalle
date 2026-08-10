CREATE TYPE "public"."usage_log_estado" AS ENUM('ABIERTO', 'CERRADO');--> statement-breakpoint
CREATE TABLE "asset_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"responsable_user_id" uuid NOT NULL,
	"proposito" text NOT NULL,
	"estado" "usage_log_estado" DEFAULT 'ABIERTO' NOT NULL,
	"fecha_salida" timestamp with time zone DEFAULT now() NOT NULL,
	"lectura_salida" numeric(18, 4),
	"foto_salida_url" text,
	"fecha_regreso" timestamp with time zone,
	"lectura_regreso" numeric(18, 4),
	"foto_regreso_url" text,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD CONSTRAINT "asset_usage_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD CONSTRAINT "asset_usage_logs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD CONSTRAINT "asset_usage_logs_responsable_user_id_users_id_fk" FOREIGN KEY ("responsable_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_usage_logs_tenant_idx" ON "asset_usage_logs" USING btree ("tenant_id","asset_id","fecha_salida");--> statement-breakpoint
CREATE INDEX "asset_usage_logs_estado_idx" ON "asset_usage_logs" USING btree ("tenant_id","estado");