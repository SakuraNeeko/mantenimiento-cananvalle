ALTER TABLE "asset_usage_logs" ALTER COLUMN "responsable_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD COLUMN "responsable_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD COLUMN "llegada_site_id" uuid;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD CONSTRAINT "asset_usage_logs_responsable_id_responsibles_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."responsibles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ADD CONSTRAINT "asset_usage_logs_llegada_site_id_sites_id_fk" FOREIGN KEY ("llegada_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;