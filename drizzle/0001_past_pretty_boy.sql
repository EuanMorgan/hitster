CREATE TYPE "public"."hitster_steal_phase" AS ENUM('decide', 'place');--> statement-breakpoint
CREATE TYPE "public"."hitster_year_lookup_status" AS ENUM('pending', 'in_progress', 'complete');--> statement-breakpoint
CREATE TABLE "hitster_isrc_year_cache" (
	"isrc" varchar(12) PRIMARY KEY NOT NULL,
	"original_year" integer NOT NULL,
	"spotify_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "steal_phase" "hitster_steal_phase";--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "steal_decide_phase_end_at" timestamp;--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "steal_place_phase_end_at" timestamp;--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "decided_stealers" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "player_skips" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "year_lookup_status" "hitster_year_lookup_status";--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "year_lookup_progress" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "year_lookup_total" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD COLUMN "shuffle_turns" boolean DEFAULT false NOT NULL;