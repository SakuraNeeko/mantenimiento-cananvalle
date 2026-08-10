DROP INDEX "assets_clase_idx";--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "clase_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" DROP COLUMN "clase";--> statement-breakpoint
ALTER TABLE "maintenance_plans" DROP COLUMN "clase_filtro";--> statement-breakpoint
DROP TYPE "public"."asset_clase";