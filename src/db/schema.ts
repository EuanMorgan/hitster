import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const gameStateEnum = pgEnum("game_state", [
  "lobby",
  "playing",
  "finished",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  spotifyId: varchar("spotify_id", { length: 255 }).unique(),
  spotifyAccessToken: text("spotify_access_token"),
  spotifyRefreshToken: text("spotify_refresh_token"),
  spotifyTokenExpiresAt: timestamp("spotify_token_expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pin: varchar("pin", { length: 4 }).notNull().unique(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id),
  state: gameStateEnum("state").notNull().default("lobby"),
  songsToWin: integer("songs_to_win").notNull().default(10),
  songPlayDuration: integer("song_play_duration").notNull().default(30),
  turnDuration: integer("turn_duration").notNull().default(45),
  stealWindowDuration: integer("steal_window_duration").notNull().default(10),
  maxPlayers: integer("max_players").notNull().default(10),
  playlistUrl: text("playlist_url"),
  currentTurnIndex: integer("current_turn_index").default(0),
  turnOrder: jsonb("turn_order").$type<string[]>(),
  usedSongIds: jsonb("used_song_ids").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  name: varchar("name", { length: 50 }).notNull(),
  avatar: varchar("avatar", { length: 10 }).notNull(),
  tokens: integer("tokens").notNull().default(2),
  timeline: jsonb("timeline").$type<TimelineSong[]>().default([]),
  isHost: boolean("is_host").notNull().default(false),
  isConnected: boolean("is_connected").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const turns = pgTable("turns", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  songId: varchar("song_id", { length: 255 }).notNull(),
  songName: varchar("song_name", { length: 500 }),
  songArtist: varchar("song_artist", { length: 500 }),
  songYear: integer("song_year").notNull(),
  placementIndex: integer("placement_index"),
  wasCorrect: boolean("was_correct"),
  guessedName: varchar("guessed_name", { length: 500 }),
  guessedArtist: varchar("guessed_artist", { length: 500 }),
  guessWasCorrect: boolean("guess_was_correct"),
  stealAttempts: jsonb("steal_attempts").$type<StealAttempt[]>().default([]),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gameHistory = pgTable("game_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  hostId: uuid("host_id")
    .notNull()
    .references(() => users.id),
  winnerId: uuid("winner_id").references(() => players.id),
  finalStandings: jsonb("final_standings").$type<PlayerStanding[]>(),
  gameData: jsonb("game_data"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export type TimelineSong = {
  songId: string;
  name: string;
  artist: string;
  year: number;
  addedAt: string;
};

export type StealAttempt = {
  playerId: string;
  placementIndex: number;
  wasCorrect: boolean;
  timestamp: string;
};

export type PlayerStanding = {
  playerId: string;
  playerName: string;
  avatar: string;
  timelineCount: number;
  tokensRemaining: number;
  correctPlacements: number;
  totalPlacements: number;
};

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Turn = typeof turns.$inferSelect;
export type NewTurn = typeof turns.$inferInsert;
export type GameHistory = typeof gameHistory.$inferSelect;
export type NewGameHistory = typeof gameHistory.$inferInsert;
