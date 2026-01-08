import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { env } from "@/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: env.NEXT_PUBLIC_APP_URL,
  socialProviders: {
    spotify: {
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
      scope: [
        "streaming",
        "user-read-email",
        "user-read-private",
        "playlist-read-private",
      ],
    },
  },
});

export type Session = typeof auth.$Infer.Session;
