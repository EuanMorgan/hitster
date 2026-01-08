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
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

// Better Auth relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  gameSessions: many(gameSessions),
  gameHistories: many(gameHistory),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Game-specific tables
export const gameStateEnum = pgEnum("game_state", [
  "lobby",
  "playing",
  "finished",
]);

export type CurrentTurnSong = {
  songId: string;
  name: string;
  artist: string;
  year: number;
};

export type ActiveStealAttempt = {
  playerId: string;
  playerName: string;
  placementIndex: number;
  timestamp: string;
};

export type ActivePlayerGuess = {
  guessedName: string | null;
  guessedArtist: string | null;
};

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pin: varchar("pin", { length: 4 }).notNull().unique(),
  hostId: text("host_id")
    .notNull()
    .references(() => user.id),
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
  currentSong: jsonb("current_song").$type<CurrentTurnSong | null>(),
  turnStartedAt: timestamp("turn_started_at"),
  roundNumber: integer("round_number").default(1),
  // Steal phase tracking
  isStealPhase: boolean("is_steal_phase").default(false),
  stealPhaseEndAt: timestamp("steal_phase_end_at"),
  activePlayerPlacement: integer("active_player_placement"),
  activePlayerGuess: jsonb("active_player_guess").$type<ActivePlayerGuess>(),
  stealAttempts: jsonb("steal_attempts").$type<ActiveStealAttempt[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id),
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
  hostId: text("host_id")
    .notNull()
    .references(() => user.id),
  winnerId: uuid("winner_id").references(() => players.id),
  finalStandings: jsonb("final_standings").$type<PlayerStanding[]>(),
  gameData: jsonb("game_data"),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

// Game relations
export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  host: one(user, {
    fields: [gameSessions.hostId],
    references: [user.id],
  }),
  players: many(players),
  turns: many(turns),
  history: one(gameHistory),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  session: one(gameSessions, {
    fields: [players.sessionId],
    references: [gameSessions.id],
  }),
  user: one(user, {
    fields: [players.userId],
    references: [user.id],
  }),
  turns: many(turns),
}));

export const turnsRelations = relations(turns, ({ one }) => ({
  session: one(gameSessions, {
    fields: [turns.sessionId],
    references: [gameSessions.id],
  }),
  player: one(players, {
    fields: [turns.playerId],
    references: [players.id],
  }),
}));

export const gameHistoryRelations = relations(gameHistory, ({ one }) => ({
  session: one(gameSessions, {
    fields: [gameHistory.sessionId],
    references: [gameSessions.id],
  }),
  host: one(user, {
    fields: [gameHistory.hostId],
    references: [user.id],
  }),
  winner: one(players, {
    fields: [gameHistory.winnerId],
    references: [players.id],
  }),
}));

// Types
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

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type NewGameSession = typeof gameSessions.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Turn = typeof turns.$inferSelect;
export type NewTurn = typeof turns.$inferInsert;
export type GameHistory = typeof gameHistory.$inferSelect;
export type NewGameHistory = typeof gameHistory.$inferInsert;
