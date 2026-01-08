import { z } from "zod/v4";
import { baseProcedure, createTRPCRouter } from "../init";
import { gameRouter } from "./game";

export const appRouter = createTRPCRouter({
  healthcheck: baseProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  hello: baseProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return { greeting: `Hello, ${input.name ?? "world"}!` };
    }),

  game: gameRouter,
});

export type AppRouter = typeof appRouter;
