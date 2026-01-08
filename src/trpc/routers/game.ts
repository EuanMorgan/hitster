import { createTRPCRouter, baseProcedure } from "../init";
import { z } from "zod/v4";
import { gameSessions, players, type Player } from "@/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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
        state: session.state,
        maxPlayers: session.maxPlayers,
        players: session.players.map((p: Player) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isHost: p.isHost,
        })),
      };
    }),
});
