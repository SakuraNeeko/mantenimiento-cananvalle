ALTER TABLE "asset_usage_logs" DROP CONSTRAINT "asset_usage_logs_responsable_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "asset_usage_logs" ALTER COLUMN "responsable_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "asset_usage_logs" DROP COLUMN "responsable_user_id";