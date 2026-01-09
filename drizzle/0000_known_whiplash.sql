CREATE TYPE "public"."hitster_game_state" AS ENUM('lobby', 'playing', 'finished');--> statement-breakpoint
CREATE TABLE "hitster_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hitster_game_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"host_id" text NOT NULL,
	"winner_id" uuid,
	"final_standings" jsonb,
	"game_data" jsonb,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hitster_game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pin" varchar(4) NOT NULL,
	"host_id" text NOT NULL,
	"state" "hitster_game_state" DEFAULT 'lobby' NOT NULL,
	"songs_to_win" integer DEFAULT 10 NOT NULL,
	"song_play_duration" integer DEFAULT 30 NOT NULL,
	"turn_duration" integer DEFAULT 45 NOT NULL,
	"steal_window_duration" integer DEFAULT 10 NOT NULL,
	"max_players" integer DEFAULT 10 NOT NULL,
	"playlist_url" text,
	"current_turn_index" integer DEFAULT 0,
	"turn_order" jsonb,
	"used_song_ids" jsonb DEFAULT '[]'::jsonb,
	"current_song" jsonb,
	"turn_started_at" timestamp,
	"round_number" integer DEFAULT 1,
	"is_steal_phase" boolean DEFAULT false,
	"steal_phase_end_at" timestamp,
	"active_player_placement" integer,
	"active_player_guess" jsonb,
	"steal_attempts" jsonb DEFAULT '[]'::jsonb,
	"playlist_songs" jsonb,
	"using_fallback_playlist" boolean DEFAULT false,
	"games_played" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hitster_game_sessions_pin_unique" UNIQUE("pin")
);
--> statement-breakpoint
CREATE TABLE "hitster_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text,
	"name" varchar(50) NOT NULL,
	"avatar" varchar(10) NOT NULL,
	"tokens" integer DEFAULT 2 NOT NULL,
	"timeline" jsonb DEFAULT '[]'::jsonb,
	"wins" integer DEFAULT 0 NOT NULL,
	"is_host" boolean DEFAULT false NOT NULL,
	"is_connected" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hitster_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "hitster_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "hitster_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"song_id" varchar(255) NOT NULL,
	"song_name" varchar(500),
	"song_artist" varchar(500),
	"song_year" integer NOT NULL,
	"placement_index" integer,
	"was_correct" boolean,
	"guessed_name" varchar(500),
	"guessed_artist" varchar(500),
	"guess_was_correct" boolean,
	"steal_attempts" jsonb DEFAULT '[]'::jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hitster_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hitster_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "hitster_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hitster_account" ADD CONSTRAINT "hitster_account_user_id_hitster_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hitster_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_game_history" ADD CONSTRAINT "hitster_game_history_session_id_hitster_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hitster_game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_game_history" ADD CONSTRAINT "hitster_game_history_host_id_hitster_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hitster_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_game_history" ADD CONSTRAINT "hitster_game_history_winner_id_hitster_players_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."hitster_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_game_sessions" ADD CONSTRAINT "hitster_game_sessions_host_id_hitster_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."hitster_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_players" ADD CONSTRAINT "hitster_players_session_id_hitster_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hitster_game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_players" ADD CONSTRAINT "hitster_players_user_id_hitster_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hitster_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_session" ADD CONSTRAINT "hitster_session_user_id_hitster_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hitster_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_turns" ADD CONSTRAINT "hitster_turns_session_id_hitster_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hitster_game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hitster_turns" ADD CONSTRAINT "hitster_turns_player_id_hitster_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."hitster_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "hitster_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_sessions_pin_idx" ON "hitster_game_sessions" USING btree ("pin");--> statement-breakpoint
CREATE INDEX "players_sessionId_idx" ON "hitster_players" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "hitster_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "turns_sessionId_idx" ON "hitster_turns" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "hitster_verification" USING btree ("identifier");