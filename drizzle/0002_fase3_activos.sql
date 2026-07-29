CREATE TYPE "public"."asset_clase" AS ENUM('EQUIPO', 'VEHICULO', 'INFRAESTRUCTURA', 'TI', 'BIOMEDICO', 'HERRAMIENTA');--> statement-breakpoint
CREATE TYPE "public"."asset_documento_tipo" AS ENUM('MANUAL', 'PLANO', 'CERTIFICADO', 'GARANTIA', 'OTRO');--> statement-breakpoint
CREATE TYPE "public"."asset_estado" AS ENUM('OPERATIVO', 'EN_MANTENIMIENTO', 'FUERA_DE_SERVICIO', 'DADO_DE_BAJA');--> statement-breakpoint
CREATE TYPE "public"."meter_reading_origen" AS ENUM('MANUAL', 'MOVIL', 'API');--> statement-breakpoint
CREATE TABLE "asset_characteristics" (
	"asset_id" uuid NOT NULL,
	"characteristic_id" uuid NOT NULL,
	"valor" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "asset_characteristics_asset_id_characteristic_id_pk" PRIMARY KEY("asset_id","characteristic_id")
);
--> statement-breakpoint
CREATE TABLE "asset_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"tipo" "asset_documento_tipo" DEFAULT 'OTRO' NOT NULL,
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
CREATE TABLE "asset_meters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"meter_id" uuid NOT NULL,
	"valor_actual" numeric(18, 4) DEFAULT '0' NOT NULL,
	"promedio_uso_diario" numeric(18, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asset_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"estado_anterior" "asset_estado",
	"estado_nuevo" "asset_estado" NOT NULL,
	"motivo" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "asset_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"location_origen_id" uuid,
	"location_destino_id" uuid,
	"cost_center_origen_id" uuid,
	"cost_center_destino_id" uuid,
	"motivo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"parent_id" uuid,
	"clase" "asset_clase" DEFAULT 'EQUIPO' NOT NULL,
	"estado" "asset_estado" DEFAULT 'OPERATIVO' NOT NULL,
	"criticidad" "criticality" DEFAULT 'C' NOT NULL,
	"location_id" uuid,
	"cost_center_id" uuid,
	"responsible_center_id" uuid,
	"fabricante" text,
	"modelo" text,
	"serie" text,
	"anio" integer,
	"fecha_compra" date,
	"valor_compra" numeric(18, 4),
	"valor_actual" numeric(18, 4),
	"vida_util_meses" integer,
	"garantia_fin" date,
	"dias_alerta_garantia" integer DEFAULT 30 NOT NULL,
	"party_id" uuid,
	"contract_id" uuid,
	"foto_url" text,
	"latitud" text,
	"longitud" text,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "meter_readings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_meter_id" uuid NOT NULL,
	"valor" numeric(18, 4) NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"origen" "meter_reading_origen" DEFAULT 'MANUAL' NOT NULL,
	"observacion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "asset_characteristics" ADD CONSTRAINT "asset_characteristics_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_characteristics" ADD CONSTRAINT "asset_characteristics_characteristic_id_characteristics_id_fk" FOREIGN KEY ("characteristic_id") REFERENCES "public"."characteristics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_meters" ADD CONSTRAINT "asset_meters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_meters" ADD CONSTRAINT "asset_meters_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_meters" ADD CONSTRAINT "asset_meters_meter_id_meters_id_fk" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_location_origen_id_locations_id_fk" FOREIGN KEY ("location_origen_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_location_destino_id_locations_id_fk" FOREIGN KEY ("location_destino_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_cost_center_origen_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_origen_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_cost_center_destino_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_destino_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_parent_id_assets_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_responsible_center_id_responsible_centers_id_fk" FOREIGN KEY ("responsible_center_id") REFERENCES "public"."responsible_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_asset_meter_id_asset_meters_id_fk" FOREIGN KEY ("asset_meter_id") REFERENCES "public"."asset_meters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_documents_asset_idx" ON "asset_documents" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "asset_meters_uq" ON "asset_meters" USING btree ("asset_id","meter_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "asset_meters_asset_idx" ON "asset_meters" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_status_history_asset_idx" ON "asset_status_history" USING btree ("asset_id","fecha");--> statement-breakpoint
CREATE INDEX "asset_transfers_asset_idx" ON "asset_transfers" USING btree ("asset_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "assets_codigo_uq" ON "assets" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "assets_tenant_idx" ON "assets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "assets_parent_idx" ON "assets" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "assets_location_idx" ON "assets" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "assets_clase_idx" ON "assets" USING btree ("tenant_id","clase");--> statement-breakpoint
CREATE INDEX "assets_estado_idx" ON "assets" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "meter_readings_asset_meter_idx" ON "meter_readings" USING btree ("asset_meter_id","fecha");