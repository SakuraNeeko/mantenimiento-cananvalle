CREATE TYPE "public"."kardex_movement_estado" AS ENUM('BORRADOR', 'CONFIRMADO', 'ANULADO');--> statement-breakpoint
CREATE TYPE "public"."material_tipo" AS ENUM('REPUESTO', 'INSUMO', 'HERRAMIENTA', 'EPP');--> statement-breakpoint
CREATE TYPE "public"."physical_inventory_estado" AS ENUM('BORRADOR', 'CONFIRMADO');--> statement-breakpoint
CREATE TABLE "kardex_movement_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movement_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"cantidad" numeric(18, 4) NOT NULL,
	"costo_unitario" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"lote" text,
	"serie" text,
	"fecha_vencimiento" date,
	"saldo_resultante" numeric(18, 4)
);
--> statement-breakpoint
CREATE TABLE "kardex_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consecutivo" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"kardex_concept_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"party_id" uuid,
	"documento_soporte" text,
	"estado" "kardex_movement_estado" DEFAULT 'BORRADOR' NOT NULL,
	"motivo_anulacion" text,
	"movimiento_origen_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"confirmado_at" timestamp with time zone,
	"confirmado_by" uuid
);
--> statement-breakpoint
CREATE TABLE "material_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"party_id" uuid,
	"fabricante" text,
	"referencia_fabricante" text,
	"referencia_proveedor" text,
	"precio" numeric(18, 4),
	"tiempo_entrega_dias" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"tipo" "material_tipo" DEFAULT 'REPUESTO' NOT NULL,
	"uom_id" uuid,
	"categoria" text,
	"critico" boolean DEFAULT false NOT NULL,
	"maneja_lote" boolean DEFAULT false NOT NULL,
	"maneja_serie" boolean DEFAULT false NOT NULL,
	"imagen_url" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "physical_inventories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"estado" "physical_inventory_estado" DEFAULT 'BORRADOR' NOT NULL,
	"confirmado_at" timestamp with time zone,
	"confirmado_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "physical_inventory_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"cantidad_sistema" numeric(18, 4) NOT NULL,
	"cantidad_contada" numeric(18, 4)
);
--> statement-breakpoint
CREATE TABLE "stock_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"lote" text NOT NULL,
	"serie" text,
	"fecha_vencimiento" date,
	"cantidad" numeric(18, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "warehouse_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"cantidad" numeric(18, 4) DEFAULT '0' NOT NULL,
	"minimo" numeric(18, 4),
	"maximo" numeric(18, 4),
	"punto_pedido" numeric(18, 4),
	"ubicacion_estante" text,
	"costo_promedio" numeric(18, 4) DEFAULT '0' NOT NULL,
	"ultima_entrada_at" timestamp with time zone,
	"ultima_salida_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "asset_spare_parts" (
	"asset_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"cantidad" numeric(18, 4) DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "asset_spare_parts_asset_id_material_id_pk" PRIMARY KEY("asset_id","material_id")
);
--> statement-breakpoint
ALTER TABLE "references" ADD COLUMN "material_id" uuid;--> statement-breakpoint
ALTER TABLE "kardex_movement_lines" ADD CONSTRAINT "kardex_movement_lines_movement_id_kardex_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."kardex_movements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex_movement_lines" ADD CONSTRAINT "kardex_movement_lines_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex_movements" ADD CONSTRAINT "kardex_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex_movements" ADD CONSTRAINT "kardex_movements_kardex_concept_id_kardex_concepts_id_fk" FOREIGN KEY ("kardex_concept_id") REFERENCES "public"."kardex_concepts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex_movements" ADD CONSTRAINT "kardex_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex_movements" ADD CONSTRAINT "kardex_movements_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex_movements" ADD CONSTRAINT "kardex_movements_movimiento_origen_id_kardex_movements_id_fk" FOREIGN KEY ("movimiento_origen_id") REFERENCES "public"."kardex_movements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_references" ADD CONSTRAINT "material_references_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_references" ADD CONSTRAINT "material_references_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_references" ADD CONSTRAINT "material_references_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_uom_id_uoms_id_fk" FOREIGN KEY ("uom_id") REFERENCES "public"."uoms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_inventories" ADD CONSTRAINT "physical_inventories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_inventories" ADD CONSTRAINT "physical_inventories_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_inventory_lines" ADD CONSTRAINT "physical_inventory_lines_inventory_id_physical_inventories_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."physical_inventories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_inventory_lines" ADD CONSTRAINT "physical_inventory_lines_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_spare_parts" ADD CONSTRAINT "asset_spare_parts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_spare_parts" ADD CONSTRAINT "asset_spare_parts_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kardex_movement_lines_movement_idx" ON "kardex_movement_lines" USING btree ("movement_id");--> statement-breakpoint
CREATE INDEX "kardex_movement_lines_material_idx" ON "kardex_movement_lines" USING btree ("material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kardex_movements_consecutivo_uq" ON "kardex_movements" USING btree ("tenant_id","consecutivo");--> statement-breakpoint
CREATE INDEX "kardex_movements_tenant_idx" ON "kardex_movements" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX "kardex_movements_warehouse_idx" ON "kardex_movements" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "kardex_movements_estado_idx" ON "kardex_movements" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "material_references_material_idx" ON "material_references" USING btree ("material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "materials_codigo_uq" ON "materials" USING btree ("tenant_id","codigo") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "materials_tenant_idx" ON "materials" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "materials_tipo_idx" ON "materials" USING btree ("tenant_id","tipo");--> statement-breakpoint
CREATE INDEX "physical_inventories_tenant_idx" ON "physical_inventories" USING btree ("tenant_id","warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "physical_inventory_lines_uq" ON "physical_inventory_lines" USING btree ("inventory_id","material_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_lots_uq" ON "stock_lots" USING btree ("warehouse_id","material_id","lote");--> statement-breakpoint
CREATE INDEX "stock_lots_material_idx" ON "stock_lots" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "stock_lots_vencimiento_idx" ON "stock_lots" USING btree ("material_id","fecha_vencimiento");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_stock_uq" ON "warehouse_stock" USING btree ("warehouse_id","material_id");--> statement-breakpoint
CREATE INDEX "warehouse_stock_material_idx" ON "warehouse_stock" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "warehouse_stock_tenant_idx" ON "warehouse_stock" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "references" ADD CONSTRAINT "references_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;