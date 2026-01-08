import { createTRPCRouter, baseProcedure, protectedProcedure } from "../init";
import { z } from "zod/v4";
import {
  gameSessions,
  players,
  type Player,
  type TimelineSong,
} from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Placeholder songs until Spotify integration
const PLACEHOLDER_SONGS = [
  { songId: "1", name: "Bohemian Rhapsody", artist: "Queen", year: 1975 },
  { songId: "2", name: "Hotel California", artist: "Eagles", year: 1977 },
  { songId: "3", name: "Thriller", artist: "Michael Jackson", year: 1982 },
  { songId: "4", name: "Sweet Child O' Mine", artist: "Guns N' Roses", year: 1987 },
  { songId: "5", name: "Smells Like Teen Spirit", artist: "Nirvana", year: 1991 },
  { songId: "6", name: "Wonderwall", artist: "Oasis", year: 1995 },
  { songId: "7", name: "Crazy in Love", artist: "Beyoncé", year: 2003 },
  { songId: "8", name: "Rolling in the Deep", artist: "Adele", year: 2010 },
  { songId: "9", name: "Uptown Funk", artist: "Bruno Mars", year: 2014 },
  { songId: "10", name: "Blinding Lights", artist: "The Weeknd", year: 2019 },
  { songId: "11", name: "Billie Jean", artist: "Michael Jackson", year: 1983 },
  { songId: "12", name: "Like a Prayer", artist: "Madonna", year: 1989 },
  { songId: "13", name: "Lose Yourself", artist: "Eminem", year: 2002 },
  { songId: "14", name: "Shape of You", artist: "Ed Sheeran", year: 2017 },
  { songId: "15", name: "Bad Guy", artist: "Billie Eilish", year: 2019 },
  { songId: "16", name: "Respect", artist: "Aretha Franklin", year: 1967 },
  { songId: "17", name: "Stayin' Alive", artist: "Bee Gees", year: 1977 },
  { songId: "18", name: "Take On Me", artist: "a-ha", year: 1985 },
  { songId: "19", name: "Vogue", artist: "Madonna", year: 1990 },
  { songId: "20", name: "No Scrubs", artist: "TLC", year: 1999 },
];

function generatePin(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pin = "";
  for (let i = 0; i < 4; i++) {
    pin += chars[Math.floor(Math.random() * chars.length)];
  }
  return pin;
}

export const gameRouter = createTRPCRouter({
  validatePin: baseProcedure
    .input(z.object({ pin: z.string().length(4).toUpperCase() }))
    .query(async ({ ctx, input }) => {
      const pin = input.pin.toUpperCase();

      const session = await ctx.db.query.gameSessions.findFirst({
        where: eq(gameSessions.pin, pin),
        with: { players: true },
      });

      if (!session) {
        return { valid: false, reason: "Game not found" } as const;
      }

      if (session.state === "playing") {
        return { valid: false, reason: "Game in progress" } as const;
      }

      if (session.state === "finished") {
        return { valid: false, reason: "Game has ended" } as const;
      }

      const connectedPlayers = session.players.filter((p: Player) => p.isConnected);
      if (connectedPlayers.length >= session.maxPlayers) {
        return { valid: false, reason: "Game is full" } as const;
      }

      return {
        valid: true,
        sessionId: session.id,
        playerCount: connectedPlayers.length,
        maxPlayers: session.maxPlayers,
      } as const;
    }),

  checkNameAvailable: baseProcedure
    .input(
      z.object({
        pin: z.string().length(4),
        name: z.string().min(1).max(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const pin = input.pin.toUpperCase();
      const name = input.name.trim();

      const session = await ctx.db.query.gameSessions.findFirst({
        where: eq(gameSessions.pin, pin),
        with: { players: true },
      });

      if (!session) {
        return { available: false, reason: "Game not found" } as const;
      }

      const nameTaken = session.players.some(
        (p: Player) => p.name.toLowerCase() === name.toLowerCase() && p.isConnected
      );

      return { available: !nameTaken } as const;
    }),

  joinGame: baseProcedure
    .input(
      z.object({
        pin: z.string().length(4),
        name: z.string().min(1).max(50),
        avatar: z.string().min(1).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pin = input.pin.toUpperCase();
      const name = input.name.trim();
      const avatar = input.avatar;

      const session = await ctx.db.query.gameSessions.findFirst({
        where: eq(gameSessions.pin, pin),
        with: { players: true },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (session.state !== "lobby") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            session.state === "playing"
              ? "Game in progress"
              : "Game has ended",
        });
      }

      const connectedPlayers = session.players.filter((p: Player) => p.isConnected);
      if (connectedPlayers.length >= session.maxPlayers) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Game is full" });
      }

      const nameTaken = session.players.some(
        (p: Player) => p.name.toLowerCase() === name.toLowerCase() && p.isConnected
      );
      if (nameTaken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Name already taken",
        });
      }

      // Check for disconnected player with same name (reconnection)
      const existingPlayer = session.players.find(
        (p: Player) => p.name.toLowerCase() === name.toLowerCase() && !p.isConnected
      );

      if (existingPlayer) {
        // Reconnect existing player
        await ctx.db
          .update(players)
          .set({ isConnected: true, avatar })
          .where(eq(players.id, existingPlayer.id));

        return { playerId: existingPlayer.id, sessionId: session.id };
      }

      // Create new player
      const [newPlayer] = await ctx.db
        .insert(players)
        .values({
          sessionId: session.id,
          name,
          avatar,
          isHost: false,
          tokens: 2,
          timeline: [],
        })
        .returning();

      return { playerId: newPlayer.id, sessionId: session.id };
    }),

  getSession: baseProcedure
    .input(z.object({ pin: z.string().length(4) }))
    .query(async ({ ctx, input }) => {
      const pin = input.pin.toUpperCase();

      const session = await ctx.db.query.gameSessions.findFirst({
        where: eq(gameSessions.pin, pin),
        with: {
          players: {
            where: eq(players.isConnected, true),
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      // For playing state, order players by turn order
      let orderedPlayers = session.players;
      if (session.state === "playing" && session.turnOrder) {
        const turnOrderMap = new Map(
          session.turnOrder.map((id, index) => [id, index])
        );
        orderedPlayers = [...session.players].sort((a, b) => {
          const aIndex = turnOrderMap.get(a.id) ?? 999;
          const bIndex = turnOrderMap.get(b.id) ?? 999;
          return aIndex - bIndex;
        });
      }

      return {
        id: session.id,
        pin: session.pin,
        hostId: session.hostId,
        state: session.state,
        songsToWin: session.songsToWin,
        songPlayDuration: session.songPlayDuration,
        turnDuration: session.turnDuration,
        stealWindowDuration: session.stealWindowDuration,
        maxPlayers: session.maxPlayers,
        playlistUrl: session.playlistUrl,
        turnOrder: session.turnOrder,
        currentTurnIndex: session.currentTurnIndex,
        currentPlayerId:
          session.turnOrder && session.currentTurnIndex !== null
            ? session.turnOrder[session.currentTurnIndex]
            : null,
        players: orderedPlayers.map((p: Player) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isHost: p.isHost,
          tokens: p.tokens,
          timeline: p.timeline,
        })),
      };
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        pin: z.string().length(4),
        songsToWin: z.number().int().min(5).max(20).optional(),
        songPlayDuration: z.number().int().min(15).max(60).optional(),
        turnDuration: z.number().int().min(30).max(90).optional(),
        stealWindowDuration: z.number().int().min(5).max(20).optional(),
        maxPlayers: z.number().int().min(1).max(20).optional(),
        playlistUrl: z.string().url().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pin = input.pin.toUpperCase();

      const session = await ctx.db.query.gameSessions.findFirst({
        where: eq(gameSessions.pin, pin),
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (session.hostId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the host can update settings",
        });
      }

      if (session.state !== "lobby") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update settings after game has started",
        });
      }

      const { pin: _pin, ...updates } = input;
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );

      if (Object.keys(filteredUpdates).length === 0) {
        return { success: true };
      }

      await ctx.db
        .update(gameSessions)
        .set({ ...filteredUpdates, updatedAt: new Date() })
        .where(eq(gameSessions.id, session.id));

      return { success: true };
    }),

  createGame: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;
    const userName = ctx.user.name;

    // Generate unique PIN
    let pin: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      pin = generatePin();
      const existing = await ctx.db.query.gameSessions.findFirst({
        where: and(
          eq(gameSessions.pin, pin),
          ne(gameSessions.state, "finished")
        ),
      });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate unique PIN",
      });
    }

    // Create game session
    const [gameSession] = await ctx.db
      .insert(gameSessions)
      .values({
        pin,
        hostId: userId,
        state: "lobby",
      })
      .returning();

    // Create host as first player
    const [hostPlayer] = await ctx.db
      .insert(players)
      .values({
        sessionId: gameSession.id,
        userId,
        name: userName,
        avatar: "🎵",
        isHost: true,
        tokens: 2,
        timeline: [],
      })
      .returning();

    return {
      sessionId: gameSession.id,
      pin: gameSession.pin,
      playerId: hostPlayer.id,
    };
  }),

  startGame: protectedProcedure
    .input(z.object({ pin: z.string().length(4) }))
    .mutation(async ({ ctx, input }) => {
      const pin = input.pin.toUpperCase();

      const session = await ctx.db.query.gameSessions.findFirst({
        where: eq(gameSessions.pin, pin),
        with: {
          players: {
            where: eq(players.isConnected, true),
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (session.hostId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the host can start the game",
        });
      }

      if (session.state !== "lobby") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game has already started",
        });
      }

      const connectedPlayers = session.players;
      if (connectedPlayers.length < 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Need at least 1 player to start",
        });
      }

      // Shuffle turn order
      const playerIds = connectedPlayers.map((p: Player) => p.id);
      const turnOrder = shuffleArray(playerIds);

      // Shuffle available songs and assign one to each player
      const shuffledSongs = shuffleArray(PLACEHOLDER_SONGS);
      const usedSongIds: string[] = [];

      for (let i = 0; i < connectedPlayers.length; i++) {
        const player = connectedPlayers[i];
        const song = shuffledSongs[i];

        const timelineSong: TimelineSong = {
          songId: song.songId,
          name: song.name,
          artist: song.artist,
          year: song.year,
          addedAt: new Date().toISOString(),
        };

        await ctx.db
          .update(players)
          .set({ timeline: [timelineSong] })
          .where(eq(players.id, player.id));

        usedSongIds.push(song.songId);
      }

      // Update game session state
      await ctx.db
        .update(gameSessions)
        .set({
          state: "playing",
          turnOrder,
          currentTurnIndex: 0,
          usedSongIds,
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return {
        success: true,
        turnOrder,
        firstPlayerId: turnOrder[0],
      };
    }),
});
