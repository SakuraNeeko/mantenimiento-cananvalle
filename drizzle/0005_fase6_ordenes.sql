CREATE TYPE "public"."wo_origen" AS ENUM('MANUAL', 'PLAN', 'SS', 'PARO');--> statement-breakpoint
CREATE TYPE "public"."wo_task_tipo_respuesta" AS ENUM('OK_NO_OK', 'NUMERICO', 'TEXTO', 'FOTO', 'FIRMA');--> statement-breakpoint
CREATE TABLE "wo_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"mensaje" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wo_labor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"responsible_id" uuid,
	"fecha" date NOT NULL,
	"horas_normales" numeric(6, 2) DEFAULT '0' NOT NULL,
	"horas_extras" numeric(6, 2) DEFAULT '0' NOT NULL,
	"horas_nocturnas" numeric(6, 2) DEFAULT '0' NOT NULL,
	"costo_calculado" numeric(18, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wo_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"cantidad_solicitada" numeric(18, 4) NOT NULL,
	"cantidad_entregada" numeric(18, 4),
	"costo_unitario" numeric(18, 4),
	"costo_total" numeric(18, 4),
	"kardex_movement_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wo_other_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"other_cost_concept_id" uuid,
	"descripcion" text NOT NULL,
	"monto" numeric(18, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wo_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"estado_anterior" "wo_status",
	"estado_nuevo" "wo_status" NOT NULL,
	"motivo" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wo_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"orden" integer DEFAULT 1 NOT NULL,
	"descripcion" text NOT NULL,
	"tipo_respuesta" "wo_task_tipo_respuesta" DEFAULT 'OK_NO_OK' NOT NULL,
	"es_critica" boolean DEFAULT false NOT NULL,
	"resultado" text,
	"valor_medido" numeric(18, 4),
	"observacion" text,
	"foto_url" text,
	"completada_at" timestamp with time zone,
	"completada_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "wo_third_party_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_id" uuid NOT NULL,
	"party_id" uuid,
	"descripcion" text NOT NULL,
	"monto" numeric(18, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consecutivo" text,
	"origen" "wo_origen" DEFAULT 'MANUAL' NOT NULL,
	"service_request_id" uuid,
	"parent_work_order_id" uuid,
	"asset_id" uuid,
	"location_id" uuid,
	"cost_center_id" uuid,
	"responsible_center_id" uuid,
	"maintenance_type_id" uuid,
	"work_type_id" uuid,
	"prioridad" "priority" DEFAULT 'MEDIA' NOT NULL,
	"criticidad" "criticality" DEFAULT 'C' NOT NULL,
	"descripcion_problema" text NOT NULL,
	"estado" "wo_status" DEFAULT 'BORRADOR' NOT NULL,
	"fecha_programada" timestamp with time zone,
	"fecha_inicio_real" timestamp with time zone,
	"fecha_fin_real" timestamp with time zone,
	"responsable_principal_user_id" uuid,
	"contract_id" uuid,
	"party_id" uuid,
	"warehouse_id" uuid,
	"causa_pendiente_id" uuid,
	"causa_cierre_id" uuid,
	"causa_falla_id" uuid,
	"efecto_falla_id" uuid,
	"technical_action_id" uuid,
	"requiere_paro" boolean DEFAULT false NOT NULL,
	"permiso_trabajo_requerido" boolean DEFAULT false NOT NULL,
	"motivo_pendiente" text,
	"motivo_cancelacion" text,
	"costo_mano_obra" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_materiales" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_terceros" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_otros" numeric(18, 4) DEFAULT '0' NOT NULL,
	"costo_total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tiempo_estimado_horas" numeric(10, 2),
	"firma_ejecutor_user_id" uuid,
	"firma_ejecutor_at" timestamp with time zone,
	"firma_aprobador_user_id" uuid,
	"firma_aprobador_at" timestamp with time zone,
	"liquidada_at" timestamp with time zone,
	"liquidada_by" uuid,
	"cerrada_at" timestamp with time zone,
	"cerrada_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "wo_comments" ADD CONSTRAINT "wo_comments_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_labor" ADD CONSTRAINT "wo_labor_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_labor" ADD CONSTRAINT "wo_labor_responsible_id_responsibles_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."responsibles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_materials" ADD CONSTRAINT "wo_materials_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_materials" ADD CONSTRAINT "wo_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_materials" ADD CONSTRAINT "wo_materials_kardex_movement_id_kardex_movements_id_fk" FOREIGN KEY ("kardex_movement_id") REFERENCES "public"."kardex_movements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_other_costs" ADD CONSTRAINT "wo_other_costs_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_other_costs" ADD CONSTRAINT "wo_other_costs_other_cost_concept_id_other_cost_concepts_id_fk" FOREIGN KEY ("other_cost_concept_id") REFERENCES "public"."other_cost_concepts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_status_history" ADD CONSTRAINT "wo_status_history_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_tasks" ADD CONSTRAINT "wo_tasks_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_third_party_costs" ADD CONSTRAINT "wo_third_party_costs_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wo_third_party_costs" ADD CONSTRAINT "wo_third_party_costs_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_parent_work_order_id_work_orders_id_fk" FOREIGN KEY ("parent_work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_responsible_center_id_responsible_centers_id_fk" FOREIGN KEY ("responsible_center_id") REFERENCES "public"."responsible_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_maintenance_type_id_maintenance_types_id_fk" FOREIGN KEY ("maintenance_type_id") REFERENCES "public"."maintenance_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_responsable_principal_user_id_users_id_fk" FOREIGN KEY ("responsable_principal_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_causa_pendiente_id_wo_pending_causes_id_fk" FOREIGN KEY ("causa_pendiente_id") REFERENCES "public"."wo_pending_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_causa_cierre_id_wo_closing_causes_id_fk" FOREIGN KEY ("causa_cierre_id") REFERENCES "public"."wo_closing_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_causa_falla_id_failure_causes_id_fk" FOREIGN KEY ("causa_falla_id") REFERENCES "public"."failure_causes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_efecto_falla_id_failure_effects_id_fk" FOREIGN KEY ("efecto_falla_id") REFERENCES "public"."failure_effects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_technical_action_id_technical_actions_id_fk" FOREIGN KEY ("technical_action_id") REFERENCES "public"."technical_actions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_firma_ejecutor_user_id_users_id_fk" FOREIGN KEY ("firma_ejecutor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_firma_aprobador_user_id_users_id_fk" FOREIGN KEY ("firma_aprobador_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wo_comments_wo_idx" ON "wo_comments" USING btree ("work_order_id","created_at");--> statement-breakpoint
CREATE INDEX "wo_labor_wo_idx" ON "wo_labor" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "wo_materials_wo_idx" ON "wo_materials" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "wo_other_costs_wo_idx" ON "wo_other_costs" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "wo_status_history_wo_idx" ON "wo_status_history" USING btree ("work_order_id","fecha");--> statement-breakpoint
CREATE INDEX "wo_tasks_wo_idx" ON "wo_tasks" USING btree ("work_order_id","orden");--> statement-breakpoint
CREATE INDEX "wo_third_party_costs_wo_idx" ON "wo_third_party_costs" USING btree ("work_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_orders_consecutivo_uq" ON "work_orders" USING btree ("tenant_id","consecutivo");--> statement-breakpoint
CREATE INDEX "work_orders_tenant_idx" ON "work_orders" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "work_orders_asset_idx" ON "work_orders" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "work_orders_responsable_idx" ON "work_orders" USING btree ("responsable_principal_user_id");--> statement-breakpoint
CREATE INDEX "work_orders_parent_idx" ON "work_orders" USING btree ("parent_work_order_id");--> statement-breakpoint
CREATE INDEX "work_orders_sr_idx" ON "work_orders" USING btree ("service_request_id");