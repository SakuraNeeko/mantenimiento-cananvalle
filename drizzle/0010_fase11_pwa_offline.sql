CREATE TABLE "sync_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" uuid NOT NULL,
	"campo" text NOT NULL,
	"valor_servidor" text,
	"valor_cliente" text,
	"resuelto_como" text DEFAULT 'ULTIMA_ESCRITURA_GANA' NOT NULL,
	"work_order_id" uuid,
	"user_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sync_conflicts_tenant_idx" ON "sync_conflicts" USING btree ("tenant_id","fecha");--> statement-breakpoint
CREATE INDEX "sync_conflicts_wo_idx" ON "sync_conflicts" USING btree ("work_order_id");