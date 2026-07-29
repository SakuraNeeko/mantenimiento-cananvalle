CREATE TABLE "service_request_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_request_id" uuid NOT NULL,
	"mensaje" text NOT NULL,
	"visible_solicitante" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consecutivo" text,
	"solicitante_user_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"asset_id" uuid,
	"location_id" uuid,
	"site_id" uuid,
	"work_type_id" uuid,
	"descripcion" text NOT NULL,
	"prioridad" "priority" DEFAULT 'MEDIA' NOT NULL,
	"estado" "sr_status" DEFAULT 'BORRADOR' NOT NULL,
	"responsable_user_id" uuid,
	"fecha_compromiso" timestamp with time zone,
	"fecha_atencion" timestamp with time zone,
	"solucion_aplicada" text,
	"es_atencion_directa" boolean DEFAULT false NOT NULL,
	"causa_rechazo" text,
	"calificacion" smallint,
	"comentario_calificacion" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "service_request_notes" ADD CONSTRAINT "service_request_notes_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_solicitante_user_id_users_id_fk" FOREIGN KEY ("solicitante_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_work_type_id_work_types_id_fk" FOREIGN KEY ("work_type_id") REFERENCES "public"."work_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_responsable_user_id_users_id_fk" FOREIGN KEY ("responsable_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_request_notes_sr_idx" ON "service_request_notes" USING btree ("service_request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_requests_consecutivo_uq" ON "service_requests" USING btree ("tenant_id","consecutivo");--> statement-breakpoint
CREATE INDEX "service_requests_tenant_idx" ON "service_requests" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX "service_requests_estado_idx" ON "service_requests" USING btree ("tenant_id","estado");--> statement-breakpoint
CREATE INDEX "service_requests_solicitante_idx" ON "service_requests" USING btree ("solicitante_user_id");--> statement-breakpoint
CREATE INDEX "service_requests_responsable_idx" ON "service_requests" USING btree ("responsable_user_id");