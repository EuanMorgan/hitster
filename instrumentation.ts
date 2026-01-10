export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.MOCK_API === "true") {
      const { server } = await import("./src/mocks/server");
      server.listen({ onUnhandledRequest: "bypass" });
    }

    if (process.env.NODE_ENV === "development") {
      const intervalKey = Symbol.for("hitster.cleanup.interval");
      const existing = (globalThis as Record<symbol, NodeJS.Timeout>)[
        intervalKey
      ];
      if (existing) clearInterval(existing);

      const runCleanup = async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/cleanup`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.CRON_SECRET}`,
              },
            },
          );
          const data = await res.json();
          if (data.deleted > 0)
            console.log(`[cleanup] Deleted ${data.deleted} stale sessions`);
        } catch {
          // Server might not be ready yet - ignore
        }
      };

      (globalThis as Record<symbol, NodeJS.Timeout>)[intervalKey] = setInterval(
        runCleanup,
        5 * 60 * 1000,
      );
      setTimeout(runCleanup, 10_000);
    }
  }
}
