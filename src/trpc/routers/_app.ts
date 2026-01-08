import { createTRPCRouter, baseProcedure } from "../init";
import { z } from "zod/v4";

export const appRouter = createTRPCRouter({
  healthcheck: baseProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  hello: baseProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return { greeting: `Hello, ${input.name ?? "world"}!` };
    }),
});

export type AppRouter = typeof appRouter;
