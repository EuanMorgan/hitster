import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { auth, type Session } from "@/lib/auth";

export const createTRPCContext = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return { db, session };
});

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    // Don't expose internal errors to client
    const isInternalError =
      error.code === "INTERNAL_SERVER_ERROR" ||
      error.cause instanceof Error;

    // Log the real error server-side
    if (isInternalError && error.cause) {
      console.error("tRPC internal error:", error.cause);
    }

    return {
      ...shape,
      message: isInternalError
        ? "Something went wrong. Please try again."
        : shape.message,
    };
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session as Session,
      user: ctx.session.user,
    },
  });
});
