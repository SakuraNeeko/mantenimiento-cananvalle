CREATE TYPE "public"."adverse_event_estado" AS ENUM('ABIERTO', 'EN_GESTION', 'CERRADO');--> statement-breakpoint
CREATE TYPE "public"."adverse_event_severidad" AS ENUM('LEVE', 'MODERADA', 'GRAVE', 'CRITICA');--> statement-breakpoint
CREATE TYPE "public"."adverse_event_tipo" AS ENUM('EVENTO_ADVERSO', 'INCIDENTE', 'ALERTA_FABRICANTE');--> statement-breakpoint
CREATE TABLE "fuel_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"fuel_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"cantidad" numeric(18, 4) NOT NULL,
	"costo_unitario" numeric(18, 4) NOT NULL,
	"costo_total" numeric(18, 4) NOT NULL,
	"lectura" numeric(18, 2),
	"party_id" uuid,
	"conductor_user_id" uuid,
	"numero_factura" text,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "adverse_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"tipo" "adverse_event_tipo" DEFAULT 'EVENTO_ADVERSO' NOT NULL,
	"severidad" "adverse_event_severidad",
	"clasificacion" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"descripcion" text NOT NULL,
	"estado" "adverse_event_estado" DEFAULT 'ABIERTO' NOT NULL,
	"causa_raiz" text,
	"acciones_correctivas" text,
	"reportado_autoridad" boolean DEFAULT false NOT NULL,
	"fecha_reporte" timestamp with time zone,
	"numero_reporte" text,
	"reportante_user_id" uuid NOT NULL,
	"cerrada_at" timestamp with time zone,
	"cerrada_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_fuel_id_fuels_id_fk" FOREIGN KEY ("fuel_id") REFERENCES "public"."fuels"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_conductor_user_id_users_id_fk" FOREIGN KEY ("conductor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverse_events" ADD CONSTRAINT "adverse_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverse_events" ADD CONSTRAINT "adverse_events_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adverse_events" ADD CONSTRAINT "adverse_events_reportante_user_id_users_id_fk" FOREIGN KEY ("reportante_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fuel_records_tenant_idx" ON "fuel_records" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX "fuel_records_asset_idx" ON "fuel_records" USING btree ("asset_id","fecha");--> statement-breakpoint
CREATE INDEX "adverse_events_tenant_idx" ON "adverse_events" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "adverse_events_asset_idx" ON "adverse_events" USING btree ("asset_id","fecha");