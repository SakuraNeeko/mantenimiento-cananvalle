ALTER TABLE "asset_usage_logs" ADD COLUMN "origen_site_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD COLUMN "destino_site_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD COLUMN "destino_otro" text;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD CONSTRAINT "asset_usage_logs_origen_site_id_sites_id_fk" FOREIGN KEY ("origen_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD CONSTRAINT "asset_usage_logs_destino_site_id_sites_id_fk" FOREIGN KEY ("destino_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;