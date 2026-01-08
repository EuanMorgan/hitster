import { createTRPCRouter, baseProcedure, protectedProcedure } from "../init";
import { z } from "zod/v4";
import {
  gameSessions,
  players,
  turns,
  type Player,
  type TimelineSong,
  type CurrentTurnSong,
  type ActiveStealAttempt,
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

// Normalize string for fuzzy matching
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Check if two strings match with fuzzy tolerance
function fuzzyMatch(guess: string, actual: string, tolerance = 0.2): boolean {
  const normalizedGuess = normalizeString(guess);
  const normalizedActual = normalizeString(actual);

  if (normalizedGuess === normalizedActual) return true;
  if (normalizedActual.includes(normalizedGuess) || normalizedGuess.includes(normalizedActual)) return true;

  const distance = levenshteinDistance(normalizedGuess, normalizedActual);
  const maxLength = Math.max(normalizedGuess.length, normalizedActual.length);
  return maxLength > 0 && distance / maxLength <= tolerance;
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
        currentSong: session.currentSong,
        turnStartedAt: session.turnStartedAt?.toISOString() ?? null,
        roundNumber: session.roundNumber ?? 1,
        isStealPhase: session.isStealPhase ?? false,
        stealPhaseEndAt: session.stealPhaseEndAt?.toISOString() ?? null,
        activePlayerPlacement: session.activePlayerPlacement ?? null,
        stealAttempts: session.stealAttempts ?? [],
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

      // Draw the first song for the first turn
      const remainingSongs = shuffledSongs.slice(connectedPlayers.length);
      const firstTurnSong = remainingSongs[0];
      const currentSong: CurrentTurnSong = {
        songId: firstTurnSong.songId,
        name: firstTurnSong.name,
        artist: firstTurnSong.artist,
        year: firstTurnSong.year,
      };
      usedSongIds.push(firstTurnSong.songId);

      // Update game session state
      await ctx.db
        .update(gameSessions)
        .set({
          state: "playing",
          turnOrder,
          currentTurnIndex: 0,
          usedSongIds,
          currentSong,
          turnStartedAt: new Date(),
          roundNumber: 1,
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return {
        success: true,
        turnOrder,
        firstPlayerId: turnOrder[0],
      };
    }),

  confirmTurn: baseProcedure
    .input(
      z.object({
        pin: z.string().length(4),
        playerId: z.string().uuid(),
        placementIndex: z.number().int().min(0),
        guessedName: z.string().optional(),
        guessedArtist: z.string().optional(),
      })
    )
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

      if (session.state !== "playing") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is not in progress",
        });
      }

      if (session.isStealPhase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot confirm turn during steal phase",
        });
      }

      const currentPlayerId =
        session.turnOrder && session.currentTurnIndex !== null
          ? session.turnOrder[session.currentTurnIndex]
          : null;

      if (input.playerId !== currentPlayerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "It's not your turn",
        });
      }

      if (!session.currentSong) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No song for current turn",
        });
      }

      // Validate guesses if provided
      let guessCorrect = false;
      const guessedName = input.guessedName?.trim() || null;
      const guessedArtist = input.guessedArtist?.trim() || null;

      if (guessedName && guessedArtist) {
        const nameMatch = fuzzyMatch(guessedName, session.currentSong.name);
        const artistMatch = fuzzyMatch(guessedArtist, session.currentSong.artist);
        guessCorrect = nameMatch && artistMatch;
      }

      // Start steal phase instead of immediately resolving
      const stealPhaseEndAt = new Date(
        Date.now() + session.stealWindowDuration * 1000
      );

      // Store guesses in session for processing in resolveStealPhase
      await ctx.db
        .update(gameSessions)
        .set({
          isStealPhase: true,
          stealPhaseEndAt,
          activePlayerPlacement: input.placementIndex,
          activePlayerGuess: { guessedName, guessedArtist },
          stealAttempts: [],
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return {
        stealPhaseStarted: true,
        stealPhaseEndAt: stealPhaseEndAt.toISOString(),
        guessedName,
        guessedArtist,
        guessCorrect,
      };
    }),

  submitSteal: baseProcedure
    .input(
      z.object({
        pin: z.string().length(4),
        playerId: z.string().uuid(),
        placementIndex: z.number().int().min(0),
      })
    )
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

      if (session.state !== "playing" || !session.isStealPhase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not in steal phase",
        });
      }

      // Check if steal phase has expired
      if (session.stealPhaseEndAt && new Date() > session.stealPhaseEndAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Steal phase has ended",
        });
      }

      const currentPlayerId =
        session.turnOrder && session.currentTurnIndex !== null
          ? session.turnOrder[session.currentTurnIndex]
          : null;

      // Active player cannot steal
      if (input.playerId === currentPlayerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Active player cannot steal",
        });
      }

      const player = session.players.find((p) => p.id === input.playerId);
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
      }

      // Check if player has tokens
      if (player.tokens < 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough tokens",
        });
      }

      // Check if player already submitted a steal
      const existingAttempts = session.stealAttempts ?? [];
      if (existingAttempts.some((a) => a.playerId === input.playerId)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already submitted a steal attempt",
        });
      }

      // Check if position is already taken
      if (existingAttempts.some((a) => a.placementIndex === input.placementIndex)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This position is already taken by another steal attempt",
        });
      }

      // Deduct token
      await ctx.db
        .update(players)
        .set({ tokens: player.tokens - 1 })
        .where(eq(players.id, input.playerId));

      // Add steal attempt
      const newAttempt: ActiveStealAttempt = {
        playerId: input.playerId,
        playerName: player.name,
        placementIndex: input.placementIndex,
        timestamp: new Date().toISOString(),
      };

      await ctx.db
        .update(gameSessions)
        .set({
          stealAttempts: [...existingAttempts, newAttempt],
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return { success: true, tokenDeducted: true };
    }),

  skipSong: baseProcedure
    .input(
      z.object({
        pin: z.string().length(4),
        playerId: z.string().uuid(),
      })
    )
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

      if (session.state !== "playing") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is not in progress",
        });
      }

      if (session.isStealPhase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot skip during steal phase",
        });
      }

      const currentPlayerId =
        session.turnOrder && session.currentTurnIndex !== null
          ? session.turnOrder[session.currentTurnIndex]
          : null;

      if (input.playerId !== currentPlayerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "It's not your turn",
        });
      }

      const player = session.players.find((p) => p.id === input.playerId);
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
      }

      if (player.tokens < 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough tokens to skip",
        });
      }

      if (!session.currentSong) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No song for current turn",
        });
      }

      // Deduct token
      await ctx.db
        .update(players)
        .set({ tokens: player.tokens - 1 })
        .where(eq(players.id, input.playerId));

      // Draw a new song
      const usedSongIds = new Set(session.usedSongIds ?? []);
      usedSongIds.add(session.currentSong.songId); // Mark current song as used

      const availableSongs = PLACEHOLDER_SONGS.filter(
        (s) => !usedSongIds.has(s.songId)
      );

      if (availableSongs.length === 0) {
        // No more songs - end game
        await ctx.db
          .update(gameSessions)
          .set({
            state: "finished",
            currentSong: null,
            updatedAt: new Date(),
          })
          .where(eq(gameSessions.id, session.id));

        return {
          success: false,
          reason: "No more songs available",
          gameEnded: true,
        };
      }

      const nextSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];

      // Update session with new song and reset turn timer
      await ctx.db
        .update(gameSessions)
        .set({
          currentSong: {
            songId: nextSong.songId,
            name: nextSong.name,
            artist: nextSong.artist,
            year: nextSong.year,
          },
          usedSongIds: [...usedSongIds],
          turnStartedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return {
        success: true,
        newSong: {
          songId: nextSong.songId,
        },
        tokensRemaining: player.tokens - 1,
      };
    }),

  getFreeSong: baseProcedure
    .input(
      z.object({
        pin: z.string().length(4),
        playerId: z.string().uuid(),
      })
    )
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

      if (session.state !== "playing") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is not in progress",
        });
      }

      if (session.isStealPhase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot get free song during steal phase",
        });
      }

      const currentPlayerId =
        session.turnOrder && session.currentTurnIndex !== null
          ? session.turnOrder[session.currentTurnIndex]
          : null;

      if (input.playerId !== currentPlayerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "It's not your turn",
        });
      }

      const player = session.players.find((p) => p.id === input.playerId);
      if (!player) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Player not found" });
      }

      if (player.tokens < 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not enough tokens (need 3)",
        });
      }

      // Draw a random unused song
      const usedSongIds = new Set(session.usedSongIds ?? []);
      const availableSongs = PLACEHOLDER_SONGS.filter(
        (s) => !usedSongIds.has(s.songId)
      );

      if (availableSongs.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No more songs available",
        });
      }

      const freeSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];

      // Add song to player's timeline
      const newTimelineSong: TimelineSong = {
        songId: freeSong.songId,
        name: freeSong.name,
        artist: freeSong.artist,
        year: freeSong.year,
        addedAt: new Date().toISOString(),
      };
      const newTimeline = [...(player.timeline ?? []), newTimelineSong];

      // Deduct 3 tokens and update timeline
      await ctx.db
        .update(players)
        .set({
          tokens: player.tokens - 3,
          timeline: newTimeline,
        })
        .where(eq(players.id, input.playerId));

      // Mark song as used
      const newUsedSongIds = [...(session.usedSongIds ?? []), freeSong.songId];
      await ctx.db
        .update(gameSessions)
        .set({
          usedSongIds: newUsedSongIds,
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      // Check win condition
      if (newTimeline.length >= session.songsToWin) {
        await ctx.db
          .update(gameSessions)
          .set({
            state: "finished",
            currentSong: null,
            updatedAt: new Date(),
          })
          .where(eq(gameSessions.id, session.id));

        return {
          success: true,
          freeSong: {
            songId: freeSong.songId,
            name: freeSong.name,
            artist: freeSong.artist,
            year: freeSong.year,
          },
          tokensRemaining: player.tokens - 3,
          newTimelineCount: newTimeline.length,
          gameEnded: true,
          winnerId: input.playerId,
        };
      }

      return {
        success: true,
        freeSong: {
          songId: freeSong.songId,
          name: freeSong.name,
          artist: freeSong.artist,
          year: freeSong.year,
        },
        tokensRemaining: player.tokens - 3,
        newTimelineCount: newTimeline.length,
        gameEnded: false,
      };
    }),

  resolveStealPhase: baseProcedure
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

      if (session.state !== "playing" || !session.isStealPhase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not in steal phase",
        });
      }

      if (!session.currentSong) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No song for current turn",
        });
      }

      const currentPlayerId =
        session.turnOrder && session.currentTurnIndex !== null
          ? session.turnOrder[session.currentTurnIndex]
          : null;

      const activePlayer = session.players.find((p) => p.id === currentPlayerId);
      if (!activePlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active player not found",
        });
      }

      const activeTimeline = activePlayer.timeline ?? [];
      const sortedTimeline = [...activeTimeline].sort((a, b) => a.year - b.year);
      const songYear = session.currentSong.year;
      const activePlayerPlacement = session.activePlayerPlacement ?? 0;

      // Validate active player's placement
      let activePlayerCorrect = false;
      if (sortedTimeline.length === 0) {
        activePlayerCorrect = true;
      } else if (activePlayerPlacement === 0) {
        activePlayerCorrect = songYear <= sortedTimeline[0].year;
      } else if (activePlayerPlacement >= sortedTimeline.length) {
        activePlayerCorrect = songYear >= sortedTimeline[sortedTimeline.length - 1].year;
      } else {
        const before = sortedTimeline[activePlayerPlacement - 1];
        const after = sortedTimeline[activePlayerPlacement];
        activePlayerCorrect = songYear >= before.year && songYear <= after.year;
      }

      // Process guess if provided
      const guess = session.activePlayerGuess;
      let guessWasCorrect = false;
      if (guess?.guessedName && guess?.guessedArtist) {
        const nameMatch = fuzzyMatch(guess.guessedName, session.currentSong.name);
        const artistMatch = fuzzyMatch(guess.guessedArtist, session.currentSong.artist);
        guessWasCorrect = nameMatch && artistMatch;
      }

      // Award token if guess was correct
      if (guessWasCorrect) {
        await ctx.db
          .update(players)
          .set({ tokens: activePlayer.tokens + 1 })
          .where(eq(players.id, currentPlayerId!));
      }

      // Check steal attempts
      const stealAttempts = session.stealAttempts ?? [];
      let winningStealer: { playerId: string; playerName: string } | null = null;

      // Only process steals if active player was wrong
      if (!activePlayerCorrect && stealAttempts.length > 0) {
        // Sort by timestamp (first come first serve)
        const sortedAttempts = [...stealAttempts].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const attempt of sortedAttempts) {
          const stealer = session.players.find((p) => p.id === attempt.playerId);
          if (!stealer) continue;

          const stealerTimeline = stealer.timeline ?? [];
          const sortedStealerTimeline = [...stealerTimeline].sort((a, b) => a.year - b.year);

          // Validate stealer's placement against THEIR timeline
          let stealerCorrect = false;
          if (sortedStealerTimeline.length === 0) {
            stealerCorrect = true;
          } else if (attempt.placementIndex === 0) {
            stealerCorrect = songYear <= sortedStealerTimeline[0].year;
          } else if (attempt.placementIndex >= sortedStealerTimeline.length) {
            stealerCorrect = songYear >= sortedStealerTimeline[sortedStealerTimeline.length - 1].year;
          } else {
            const before = sortedStealerTimeline[attempt.placementIndex - 1];
            const after = sortedStealerTimeline[attempt.placementIndex];
            stealerCorrect = songYear >= before.year && songYear <= after.year;
          }

          if (stealerCorrect) {
            winningStealer = { playerId: attempt.playerId, playerName: attempt.playerName };
            break; // First correct stealer wins
          }
        }
      }

      // Record the turn
      await ctx.db.insert(turns).values({
        sessionId: session.id,
        playerId: currentPlayerId!,
        roundNumber: session.roundNumber ?? 1,
        songId: session.currentSong.songId,
        songName: session.currentSong.name,
        songArtist: session.currentSong.artist,
        songYear: session.currentSong.year,
        placementIndex: activePlayerPlacement,
        wasCorrect: activePlayerCorrect,
        guessedName: guess?.guessedName ?? null,
        guessedArtist: guess?.guessedArtist ?? null,
        guessWasCorrect,
        stealAttempts: stealAttempts.map((a) => ({
          playerId: a.playerId,
          placementIndex: a.placementIndex,
          wasCorrect: a.playerId === winningStealer?.playerId,
          timestamp: a.timestamp,
        })),
        completedAt: new Date(),
      });

      // Determine who gets the song
      let recipientId: string | null = null;
      if (activePlayerCorrect) {
        recipientId = currentPlayerId;
      } else if (winningStealer) {
        recipientId = winningStealer.playerId;
      }

      // Add song to recipient's timeline
      let gameEnded = false;
      let winnerId: string | undefined;
      if (recipientId) {
        const recipient = session.players.find((p) => p.id === recipientId);
        if (recipient) {
          const newSong: TimelineSong = {
            songId: session.currentSong.songId,
            name: session.currentSong.name,
            artist: session.currentSong.artist,
            year: session.currentSong.year,
            addedAt: new Date().toISOString(),
          };
          const newTimeline = [...(recipient.timeline ?? []), newSong];

          await ctx.db
            .update(players)
            .set({ timeline: newTimeline })
            .where(eq(players.id, recipientId));

          // Check win condition
          if (newTimeline.length >= session.songsToWin) {
            gameEnded = true;
            winnerId = recipientId;
            await ctx.db
              .update(gameSessions)
              .set({
                state: "finished",
                currentSong: null,
                isStealPhase: false,
                stealPhaseEndAt: null,
                activePlayerPlacement: null,
                activePlayerGuess: null,
                stealAttempts: [],
                updatedAt: new Date(),
              })
              .where(eq(gameSessions.id, session.id));

            return {
              activePlayerCorrect,
              song: session.currentSong,
              stolenBy: winningStealer,
              recipientId,
              gameEnded: true,
              winnerId,
              guessWasCorrect,
              guessedName: guess?.guessedName ?? null,
              guessedArtist: guess?.guessedArtist ?? null,
            };
          }
        }
      }

      // Advance to next turn
      const nextTurnIndex =
        ((session.currentTurnIndex ?? 0) + 1) % session.turnOrder!.length;
      const isNewRound = nextTurnIndex === 0;
      const newRoundNumber = isNewRound
        ? (session.roundNumber ?? 1) + 1
        : session.roundNumber ?? 1;

      // Draw next song
      const usedSongIds = new Set(session.usedSongIds ?? []);
      const availableSongs = PLACEHOLDER_SONGS.filter(
        (s) => !usedSongIds.has(s.songId)
      );

      if (availableSongs.length === 0) {
        await ctx.db
          .update(gameSessions)
          .set({
            state: "finished",
            currentSong: null,
            isStealPhase: false,
            stealPhaseEndAt: null,
            activePlayerPlacement: null,
            activePlayerGuess: null,
            stealAttempts: [],
            updatedAt: new Date(),
          })
          .where(eq(gameSessions.id, session.id));

        return {
          activePlayerCorrect,
          song: session.currentSong,
          stolenBy: winningStealer,
          recipientId,
          gameEnded: true,
          reason: "No more songs available",
          guessWasCorrect,
          guessedName: guess?.guessedName ?? null,
          guessedArtist: guess?.guessedArtist ?? null,
        };
      }

      const nextSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
      const newUsedSongIds = [...(session.usedSongIds ?? []), nextSong.songId];

      let newTurnOrder = session.turnOrder;
      if (isNewRound) {
        newTurnOrder = shuffleArray(session.turnOrder!);
      }

      await ctx.db
        .update(gameSessions)
        .set({
          currentTurnIndex: nextTurnIndex,
          turnOrder: newTurnOrder,
          roundNumber: newRoundNumber,
          currentSong: {
            songId: nextSong.songId,
            name: nextSong.name,
            artist: nextSong.artist,
            year: nextSong.year,
          },
          usedSongIds: newUsedSongIds,
          turnStartedAt: new Date(),
          isStealPhase: false,
          stealPhaseEndAt: null,
          activePlayerPlacement: null,
          activePlayerGuess: null,
          stealAttempts: [],
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return {
        activePlayerCorrect,
        song: session.currentSong,
        stolenBy: winningStealer,
        recipientId,
        gameEnded: false,
        nextPlayerId: newTurnOrder![nextTurnIndex],
        isNewRound,
        newRoundNumber,
        guessWasCorrect,
        guessedName: guess?.guessedName ?? null,
        guessedArtist: guess?.guessedArtist ?? null,
      };
    }),

  startRematch: protectedProcedure
    .input(z.object({ pin: z.string().length(4) }))
    .mutation(async ({ ctx, input }) => {
      const pin = input.pin.toUpperCase();

      const session = await ctx.db.query.gameSessions.findFirst({
        where: eq(gameSessions.pin, pin),
        with: {
          players: true,
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
      }

      if (session.hostId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the host can start a rematch",
        });
      }

      if (session.state !== "finished") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game must be finished to start a rematch",
        });
      }

      // Reset all connected players' tokens and timelines
      for (const player of session.players) {
        if (player.isConnected) {
          await ctx.db
            .update(players)
            .set({
              tokens: 2,
              timeline: [],
            })
            .where(eq(players.id, player.id));
        }
      }

      // Reset game session to lobby state
      await ctx.db
        .update(gameSessions)
        .set({
          state: "lobby",
          turnOrder: null,
          currentTurnIndex: 0,
          usedSongIds: [],
          currentSong: null,
          turnStartedAt: null,
          roundNumber: 1,
          isStealPhase: false,
          stealPhaseEndAt: null,
          activePlayerPlacement: null,
          activePlayerGuess: null,
          stealAttempts: [],
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return { success: true, pin: session.pin };
    }),
});
