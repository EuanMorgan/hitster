import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { account } from "@/db/schema";
import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "../init";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// Refresh the Spotify access token using the refresh token
async function refreshSpotifyToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "SPOTIFY_REAUTH_REQUIRED",
    });
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

// Helper to get valid access token, refreshing if needed
async function getValidAccessToken(
  db: typeof import("@/db").db,
  userId: string,
): Promise<string> {
  const spotifyAccount = await db.query.account.findFirst({
    where: eq(account.userId, userId),
  });

  if (!spotifyAccount?.accessToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "SPOTIFY_REAUTH_REQUIRED",
    });
  }

  const expiresAt = spotifyAccount.accessTokenExpiresAt;
  const isExpiringSoon =
    expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpiringSoon) {
    if (!spotifyAccount.refreshToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "SPOTIFY_REAUTH_REQUIRED",
      });
    }

    const { accessToken, expiresAt: newExpiresAt } = await refreshSpotifyToken(
      spotifyAccount.refreshToken,
    );

    await db
      .update(account)
      .set({
        accessToken,
        accessTokenExpiresAt: newExpiresAt,
      })
      .where(eq(account.id, spotifyAccount.id));

    return accessToken;
  }

  return spotifyAccount.accessToken;
}

export const spotifyRouter = createTRPCRouter({
  // Get access token for Spotify Web Playback SDK
  getAccessToken: protectedProcedure.query(async ({ ctx }) => {
    const accessToken = await getValidAccessToken(ctx.db, ctx.user.id);
    return { accessToken };
  }),

  // Fetch playlist tracks from Spotify API
  getPlaylistTracks: protectedProcedure
    .input(
      z.object({
        playlistId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessToken = await getValidAccessToken(ctx.db, ctx.user.id);

      // Fetch all tracks from the playlist (handling pagination)
      const tracks: Array<{
        songId: string;
        name: string;
        artist: string;
        year: number;
        uri: string;
        isrc?: string;
        spotifyYear?: number;
      }> = [];

      const nextUrl: string | null =
        `${SPOTIFY_API_BASE}/playlists/${input.playlistId}/tracks?limit=100`;

      let currentUrl: string | null = nextUrl;
      while (currentUrl) {
        const response: Response = await fetch(currentUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Spotify token expired. Please re-authenticate.",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch playlist tracks from Spotify",
          });
        }

        const data: {
          items: Array<{
            track?: {
              id?: string;
              name?: string;
              uri?: string;
              album?: { release_date?: string };
              artists?: Array<{ name: string }>;
              external_ids?: { isrc?: string };
            };
          }>;
          next: string | null;
        } = await response.json();

        for (const item of data.items) {
          if (!item.track) continue;

          const track = item.track;
          // Extract year from album release date
          const releaseDate = track.album?.release_date || "";
          const year = Number.parseInt(releaseDate.split("-")[0], 10);

          if (!Number.isNaN(year) && track.id && track.name) {
            tracks.push({
              songId: track.id,
              name: track.name,
              artist: track.artists?.map((a) => a.name).join(", ") || "Unknown",
              year,
              uri: track.uri || "",
              isrc: track.external_ids?.isrc,
              spotifyYear: year,
            });
          }
        }

        currentUrl = data.next;
      }

      return { tracks, totalCount: tracks.length };
    }),

  // Start playback of a track on the host's Spotify
  playTrack: protectedProcedure
    .input(
      z.object({
        trackUri: z.string(),
        deviceId: z.string(),
        positionMs: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const accessToken = await getValidAccessToken(ctx.db, ctx.user.id);

      const response = await fetch(
        `${SPOTIFY_API_BASE}/me/player/play?device_id=${input.deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: [input.trackUri],
            position_ms: input.positionMs || 0,
          }),
        },
      );

      if (!response.ok && response.status !== 204) {
        const error = await response.text();
        console.error("Spotify play error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to start playback",
        });
      }

      return { success: true };
    }),

  // Pause playback
  pausePlayback: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const accessToken = await getValidAccessToken(ctx.db, ctx.user.id);

      const response = await fetch(
        `${SPOTIFY_API_BASE}/me/player/pause?device_id=${input.deviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // 204 is success, 403 might mean already paused
      if (!response.ok && response.status !== 204 && response.status !== 403) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to pause playback",
        });
      }

      return { success: true };
    }),

  // Transfer playback to a device
  transferPlayback: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const accessToken = await getValidAccessToken(ctx.db, ctx.user.id);

      const response = await fetch(`${SPOTIFY_API_BASE}/me/player`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [input.deviceId],
          play: false,
        }),
      });

      if (!response.ok && response.status !== 204) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to transfer playback",
        });
      }

      return { success: true };
    }),
});
