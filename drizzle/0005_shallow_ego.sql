CREATE TYPE "public"."hitster_isrc_lookup_result" AS ENUM('found', 'not_found', 'no_earlier_year');--> statement-breakpoint
ALTER TABLE "hitster_isrc_year_cache" ALTER COLUMN "original_year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hitster_isrc_year_cache" ADD COLUMN "lookup_result" "hitster_isrc_lookup_result";--> statement-breakpoint
UPDATE "hitster_isrc_year_cache" SET "lookup_result" = 'found' WHERE "lookup_result" IS NULL;--> statement-breakpoint
ALTER TABLE "hitster_isrc_year_cache" ALTER COLUMN "lookup_result" SET NOT NULL;
