import { and, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { gameSessions } from "@/db/schema";

const STALE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_TIMEOUT_MS);

  const result = await db
    .delete(gameSessions)
    .where(
      and(
        lt(gameSessions.updatedAt, cutoff),
        ne(gameSessions.state, "finished"),
      ),
    )
    .returning({ id: gameSessions.id });

  return Response.json({
    deleted: result.length,
    cutoff: cutoff.toISOString(),
  });
}
