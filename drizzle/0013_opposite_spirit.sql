CREATE TABLE "asset_classes" (
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
ALTER TABLE "assets" ADD COLUMN "clase_id" uuid;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD COLUMN "clase_filtro_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_classes" ADD CONSTRAINT "asset_classes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "asset_classes_codigo_uq" ON "asset_classes" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "asset_classes_tenant_idx" ON "asset_classes" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_clase_id_asset_classes_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."asset_classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_clase_filtro_id_asset_classes_id_fk" FOREIGN KEY ("clase_filtro_id") REFERENCES "public"."asset_classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_clase_id_idx" ON "assets" USING btree ("tenant_id","clase_id");