import { createTRPCRouter, baseProcedure, protectedProcedure } from "../init";
import { z } from "zod/v4";
import { gameSessions, players, type Player } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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
        players: session.players.map((p: Player) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isHost: p.isHost,
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
});
