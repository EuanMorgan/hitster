import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod/v4";
import {
  type ActiveStealAttempt,
  account,
  type CurrentTurnSong,
  gameSessions,
  type Player,
  type PlaylistSong,
  players,
  type TimelineSong,
  turns,
} from "@/db/schema";
import { env } from "@/env";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";

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
          matrix[i - 1][j] + 1, // deletion
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
  if (
    normalizedActual.includes(normalizedGuess) ||
    normalizedGuess.includes(normalizedActual)
  )
    return true;

  const distance = levenshteinDistance(normalizedGuess, normalizedActual);
  const maxLength = Math.max(normalizedGuess.length, normalizedActual.length);
  return maxLength > 0 && distance / maxLength <= tolerance;
}

// Default playlist to use when none specified or as fallback
const DEFAULT_PLAYLIST_ID = "0Mpj1KwRmY2pHzmj7mfbdh";
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
    throw new Error("Failed to refresh Spotify token");
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

// Fetch playlist tracks from Spotify API
async function fetchPlaylistTracks(
  playlistId: string,
  accessToken: string,
): Promise<PlaylistSong[]> {
  const tracks: PlaylistSong[] = [];
  let currentUrl: string | null =
    `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?limit=100`;

  while (currentUrl) {
    const response: Response = await fetch(currentUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Playlist not found");
      }
      throw new Error("Failed to fetch playlist tracks from Spotify");
    }

    const data: {
      items: Array<{
        track?: {
          id?: string;
          name?: string;
          uri?: string;
          album?: { release_date?: string };
          artists?: Array<{ name: string }>;
        };
      }>;
      next: string | null;
    } = await response.json();

    for (const item of data.items) {
      if (!item.track) continue;

      const track = item.track;
      const releaseDate = track.album?.release_date || "";
      const year = Number.parseInt(releaseDate.split("-")[0], 10);

      if (!Number.isNaN(year) && track.id && track.name && track.uri) {
        tracks.push({
          songId: track.id,
          name: track.name,
          artist: track.artists?.map((a) => a.name).join(", ") || "Unknown",
          year,
          uri: track.uri,
        });
      }
    }

    currentUrl = data.next;
  }

  return tracks;
}

// Extract playlist ID from Spotify URL
function extractPlaylistId(url: string): string | null {
  const patterns = [
    /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    /spotify:playlist:([a-zA-Z0-9]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fallback placeholder songs (used when Spotify API unavailable)
const PLACEHOLDER_SONGS: PlaylistSong[] = [
  {
    songId: "7tFiyTwD0nx5a1eklYtX2J",
    name: "Bohemian Rhapsody",
    artist: "Queen",
    year: 1975,
    uri: "spotify:track:7tFiyTwD0nx5a1eklYtX2J",
  },
  {
    songId: "40riOy7x9W7GXjyGp4pjAv",
    name: "Hotel California",
    artist: "Eagles",
    year: 1977,
    uri: "spotify:track:40riOy7x9W7GXjyGp4pjAv",
  },
  {
    songId: "2LlQb7Uoj1kKyGhlkBf9aC",
    name: "Thriller",
    artist: "Michael Jackson",
    year: 1982,
    uri: "spotify:track:2LlQb7Uoj1kKyGhlkBf9aC",
  },
  {
    songId: "7o2CTH4ctstm8TNelqjb51",
    name: "Sweet Child O' Mine",
    artist: "Guns N' Roses",
    year: 1987,
    uri: "spotify:track:7o2CTH4ctstm8TNelqjb51",
  },
  {
    songId: "5ghIJDpPoe3CfHMGu71E6T",
    name: "Smells Like Teen Spirit",
    artist: "Nirvana",
    year: 1991,
    uri: "spotify:track:5ghIJDpPoe3CfHMGu71E6T",
  },
  {
    songId: "5wj4E6IsrVtn8IBJQOd0Cl",
    name: "Wonderwall",
    artist: "Oasis",
    year: 1995,
    uri: "spotify:track:5wj4E6IsrVtn8IBJQOd0Cl",
  },
  {
    songId: "6vQN2a9QSgWcm74KEZYfDL",
    name: "Crazy in Love",
    artist: "Beyoncé",
    year: 2003,
    uri: "spotify:track:6vQN2a9QSgWcm74KEZYfDL",
  },
  {
    songId: "4OSBTYWVwsQhGLF9NHvIbR",
    name: "Rolling in the Deep",
    artist: "Adele",
    year: 2010,
    uri: "spotify:track:4OSBTYWVwsQhGLF9NHvIbR",
  },
  {
    songId: "32OlwWuMpZ6b0aN2RZOeMS",
    name: "Uptown Funk",
    artist: "Bruno Mars",
    year: 2014,
    uri: "spotify:track:32OlwWuMpZ6b0aN2RZOeMS",
  },
  {
    songId: "0VjIjW4GlUZAMYd2vXMi3b",
    name: "Blinding Lights",
    artist: "The Weeknd",
    year: 2019,
    uri: "spotify:track:0VjIjW4GlUZAMYd2vXMi3b",
  },
  {
    songId: "7J1uxwnxfQLu4APicE5Rnj",
    name: "Billie Jean",
    artist: "Michael Jackson",
    year: 1983,
    uri: "spotify:track:7J1uxwnxfQLu4APicE5Rnj",
  },
  {
    songId: "1z3ugFmUKoCzGsI6jdY4Ci",
    name: "Like a Prayer",
    artist: "Madonna",
    year: 1989,
    uri: "spotify:track:1z3ugFmUKoCzGsI6jdY4Ci",
  },
  {
    songId: "1v7L65Lzy0j0vdpRjJewt1",
    name: "Lose Yourself",
    artist: "Eminem",
    year: 2002,
    uri: "spotify:track:1v7L65Lzy0j0vdpRjJewt1",
  },
  {
    songId: "7qiZfU4dY1lWllzX7mPBI3",
    name: "Shape of You",
    artist: "Ed Sheeran",
    year: 2017,
    uri: "spotify:track:7qiZfU4dY1lWllzX7mPBI3",
  },
  {
    songId: "2Fxmhks0bxGSBdJ92vM42m",
    name: "bad guy",
    artist: "Billie Eilish",
    year: 2019,
    uri: "spotify:track:2Fxmhks0bxGSBdJ92vM42m",
  },
  {
    songId: "7s25THrKz86DM225dOYwnr",
    name: "Respect",
    artist: "Aretha Franklin",
    year: 1967,
    uri: "spotify:track:7s25THrKz86DM225dOYwnr",
  },
  {
    songId: "3mRM4NM8iO7UBqrSigCQFH",
    name: "Stayin' Alive",
    artist: "Bee Gees",
    year: 1977,
    uri: "spotify:track:3mRM4NM8iO7UBqrSigCQFH",
  },
  {
    songId: "2WfaOiMkCvy7F5fcp2zZ8L",
    name: "Take On Me",
    artist: "a-ha",
    year: 1985,
    uri: "spotify:track:2WfaOiMkCvy7F5fcp2zZ8L",
  },
  {
    songId: "3CeCwcJO8CXqz3y7u7rqJR",
    name: "Vogue",
    artist: "Madonna",
    year: 1990,
    uri: "spotify:track:3CeCwcJO8CXqz3y7u7rqJR",
  },
  {
    songId: "3LOpEypkiAME5oAuwdB0bI",
    name: "No Scrubs",
    artist: "TLC",
    year: 1999,
    uri: "spotify:track:3LOpEypkiAME5oAuwdB0bI",
  },
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

      const connectedPlayers = session.players.filter(
        (p: Player) => p.isConnected,
      );
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
      }),
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
        (p: Player) =>
          p.name.toLowerCase() === name.toLowerCase() && p.isConnected,
      );

      return { available: !nameTaken } as const;
    }),

  joinGame: baseProcedure
    .input(
      z.object({
        pin: z.string().length(4),
        name: z.string().min(1).max(50),
        avatar: z.string().min(1).max(10),
      }),
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
            session.state === "playing" ? "Game in progress" : "Game has ended",
        });
      }

      const connectedPlayers = session.players.filter(
        (p: Player) => p.isConnected,
      );
      if (connectedPlayers.length >= session.maxPlayers) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Game is full" });
      }

      const nameTaken = session.players.some(
        (p: Player) =>
          p.name.toLowerCase() === name.toLowerCase() && p.isConnected,
      );
      if (nameTaken) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Name already taken",
        });
      }

      // Check for disconnected player with same name (reconnection)
      const existingPlayer = session.players.find(
        (p: Player) =>
          p.name.toLowerCase() === name.toLowerCase() && !p.isConnected,
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
          session.turnOrder.map((id, index) => [id, index]),
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
          wins: p.wins,
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
      }),
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
        Object.entries(updates).filter(([_, v]) => v !== undefined),
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
          ne(gameSessions.state, "finished"),
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

      // Load playlist songs from Spotify
      let playlistSongs: PlaylistSong[] = [];
      let playlistWarning: string | null = null;

      // Get host's Spotify access token
      const spotifyAccount = await ctx.db.query.account.findFirst({
        where: eq(account.userId, ctx.user.id),
      });

      if (spotifyAccount?.accessToken) {
        let accessToken = spotifyAccount.accessToken;

        // Check if token needs refresh
        const expiresAt = spotifyAccount.accessTokenExpiresAt;
        const isExpiringSoon =
          expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000;

        if (isExpiringSoon && spotifyAccount.refreshToken) {
          try {
            const { accessToken: newToken, expiresAt: newExpiresAt } =
              await refreshSpotifyToken(spotifyAccount.refreshToken);
            accessToken = newToken;

            await ctx.db
              .update(account)
              .set({
                accessToken: newToken,
                accessTokenExpiresAt: newExpiresAt,
              })
              .where(eq(account.id, spotifyAccount.id));
          } catch {
            // Fall back to placeholder if token refresh fails
            console.error(
              "Failed to refresh Spotify token, using placeholders",
            );
          }
        }

        // Determine which playlist to load
        const playlistId = session.playlistUrl
          ? extractPlaylistId(session.playlistUrl)
          : DEFAULT_PLAYLIST_ID;

        if (playlistId) {
          try {
            playlistSongs = await fetchPlaylistTracks(playlistId, accessToken);

            // Warn if fewer than 100 tracks
            if (playlistSongs.length < 100 && playlistSongs.length > 0) {
              playlistWarning = `Playlist has only ${playlistSongs.length} tracks (recommended: 100+)`;
            }
          } catch (error) {
            console.error("Failed to fetch playlist:", error);
            // If custom playlist fails, try default
            if (session.playlistUrl && playlistId !== DEFAULT_PLAYLIST_ID) {
              try {
                playlistSongs = await fetchPlaylistTracks(
                  DEFAULT_PLAYLIST_ID,
                  accessToken,
                );
                playlistWarning =
                  "Custom playlist failed, using default playlist";
              } catch {
                console.error("Failed to fetch default playlist too");
              }
            }
          }
        }
      }

      // Fall back to placeholder songs if no Spotify songs loaded
      if (playlistSongs.length === 0) {
        playlistSongs = PLACEHOLDER_SONGS;
        playlistWarning = "Using offline song library";
      }

      // Shuffle turn order
      const playerIds = connectedPlayers.map((p: Player) => p.id);
      const turnOrder = shuffleArray(playerIds);

      // Shuffle available songs and assign one to each player
      const shuffledSongs = shuffleArray(playlistSongs);
      const usedSongIds: string[] = [];

      for (let i = 0; i < connectedPlayers.length; i++) {
        const player = connectedPlayers[i];
        const song = shuffledSongs[i];

        const timelineSong: TimelineSong = {
          songId: song.songId,
          name: song.name,
          artist: song.artist,
          year: song.year,
          uri: song.uri,
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
        uri: firstTurnSong.uri,
      };
      usedSongIds.push(firstTurnSong.songId);

      // Update game session state with loaded playlist
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
          playlistSongs: shuffledSongs, // Store shuffled songs for the game
          usingFallbackPlaylist: playlistSongs === PLACEHOLDER_SONGS,
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return {
        success: true,
        turnOrder,
        firstPlayerId: turnOrder[0],
        playlistWarning,
        totalSongs: playlistSongs.length,
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
      }),
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
        const artistMatch = fuzzyMatch(
          guessedArtist,
          session.currentSong.artist,
        );
        guessCorrect = nameMatch && artistMatch;
      }

      // Start steal phase instead of immediately resolving
      const stealPhaseEndAt = new Date(
        Date.now() + session.stealWindowDuration * 1000,
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
      }),
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
      if (
        existingAttempts.some((a) => a.placementIndex === input.placementIndex)
      ) {
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
      }),
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

      // Draw a new song from the session's loaded playlist
      const usedSongIds = new Set(session.usedSongIds ?? []);
      usedSongIds.add(session.currentSong.songId); // Mark current song as used

      // Use stored playlist songs, fall back to PLACEHOLDER_SONGS
      const songPool = session.playlistSongs ?? PLACEHOLDER_SONGS;
      let availableSongs = songPool.filter((s) => !usedSongIds.has(s.songId));

      // If custom playlist exhausted, try fallback to default (placeholder) songs
      if (availableSongs.length === 0 && !session.usingFallbackPlaylist) {
        const fallbackAvailable = PLACEHOLDER_SONGS.filter(
          (s) => !usedSongIds.has(s.songId),
        );
        if (fallbackAvailable.length > 0) {
          availableSongs = fallbackAvailable;
          // Update session to use fallback
          await ctx.db
            .update(gameSessions)
            .set({ usingFallbackPlaylist: true })
            .where(eq(gameSessions.id, session.id));
        }
      }

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

      const nextSong =
        availableSongs[Math.floor(Math.random() * availableSongs.length)];

      // Update session with new song and reset turn timer
      await ctx.db
        .update(gameSessions)
        .set({
          currentSong: {
            songId: nextSong.songId,
            name: nextSong.name,
            artist: nextSong.artist,
            year: nextSong.year,
            uri: nextSong.uri,
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
      }),
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

      // Draw a random unused song from session's playlist
      const usedSongIds = new Set(session.usedSongIds ?? []);
      const songPool = session.playlistSongs ?? PLACEHOLDER_SONGS;
      let availableSongs = songPool.filter((s) => !usedSongIds.has(s.songId));

      // If custom playlist exhausted, try fallback to default songs
      if (availableSongs.length === 0 && !session.usingFallbackPlaylist) {
        const fallbackAvailable = PLACEHOLDER_SONGS.filter(
          (s) => !usedSongIds.has(s.songId),
        );
        if (fallbackAvailable.length > 0) {
          availableSongs = fallbackAvailable;
          await ctx.db
            .update(gameSessions)
            .set({ usingFallbackPlaylist: true })
            .where(eq(gameSessions.id, session.id));
        }
      }

      if (availableSongs.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No more songs available",
        });
      }

      const freeSong =
        availableSongs[Math.floor(Math.random() * availableSongs.length)];

      // Add song to player's timeline
      const newTimelineSong: TimelineSong = {
        songId: freeSong.songId,
        name: freeSong.name,
        artist: freeSong.artist,
        year: freeSong.year,
        uri: freeSong.uri,
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
        // Increment winner's wins count (player already has tokens - 3 set, wins is separate)
        await ctx.db
          .update(players)
          .set({ wins: player.wins + 1 })
          .where(eq(players.id, input.playerId));

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

      const activePlayer = session.players.find(
        (p) => p.id === currentPlayerId,
      );
      if (!activePlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active player not found",
        });
      }

      const activeTimeline = activePlayer.timeline ?? [];
      const sortedTimeline = [...activeTimeline].sort(
        (a, b) => a.year - b.year,
      );
      const songYear = session.currentSong.year;
      const activePlayerPlacement = session.activePlayerPlacement ?? 0;

      // Validate active player's placement
      let activePlayerCorrect = false;
      if (sortedTimeline.length === 0) {
        activePlayerCorrect = true;
      } else if (activePlayerPlacement === 0) {
        activePlayerCorrect = songYear <= sortedTimeline[0].year;
      } else if (activePlayerPlacement >= sortedTimeline.length) {
        activePlayerCorrect =
          songYear >= sortedTimeline[sortedTimeline.length - 1].year;
      } else {
        const before = sortedTimeline[activePlayerPlacement - 1];
        const after = sortedTimeline[activePlayerPlacement];
        activePlayerCorrect = songYear >= before.year && songYear <= after.year;
      }

      // Process guess if provided
      const guess = session.activePlayerGuess;
      let guessWasCorrect = false;
      if (guess?.guessedName && guess?.guessedArtist) {
        const nameMatch = fuzzyMatch(
          guess.guessedName,
          session.currentSong.name,
        );
        const artistMatch = fuzzyMatch(
          guess.guessedArtist,
          session.currentSong.artist,
        );
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
      let winningStealer: { playerId: string; playerName: string } | null =
        null;

      // Only process steals if active player was wrong
      if (!activePlayerCorrect && stealAttempts.length > 0) {
        // Sort by timestamp (first come first serve)
        const sortedAttempts = [...stealAttempts].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        for (const attempt of sortedAttempts) {
          const stealer = session.players.find(
            (p) => p.id === attempt.playerId,
          );
          if (!stealer) continue;

          const stealerTimeline = stealer.timeline ?? [];
          const sortedStealerTimeline = [...stealerTimeline].sort(
            (a, b) => a.year - b.year,
          );

          // Validate stealer's placement against THEIR timeline
          let stealerCorrect = false;
          if (sortedStealerTimeline.length === 0) {
            stealerCorrect = true;
          } else if (attempt.placementIndex === 0) {
            stealerCorrect = songYear <= sortedStealerTimeline[0].year;
          } else if (attempt.placementIndex >= sortedStealerTimeline.length) {
            stealerCorrect =
              songYear >=
              sortedStealerTimeline[sortedStealerTimeline.length - 1].year;
          } else {
            const before = sortedStealerTimeline[attempt.placementIndex - 1];
            const after = sortedStealerTimeline[attempt.placementIndex];
            stealerCorrect = songYear >= before.year && songYear <= after.year;
          }

          if (stealerCorrect) {
            winningStealer = {
              playerId: attempt.playerId,
              playerName: attempt.playerName,
            };
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
      let _gameEnded = false;
      let winnerId: string | undefined;
      if (recipientId) {
        const recipient = session.players.find((p) => p.id === recipientId);
        if (recipient) {
          const newSong: TimelineSong = {
            songId: session.currentSong.songId,
            name: session.currentSong.name,
            artist: session.currentSong.artist,
            year: session.currentSong.year,
            uri: session.currentSong.uri,
            addedAt: new Date().toISOString(),
          };
          const newTimeline = [...(recipient.timeline ?? []), newSong];

          await ctx.db
            .update(players)
            .set({ timeline: newTimeline })
            .where(eq(players.id, recipientId));

          // Check win condition
          if (newTimeline.length >= session.songsToWin) {
            _gameEnded = true;
            winnerId = recipientId;

            // Increment winner's wins count
            await ctx.db
              .update(players)
              .set({ wins: recipient.wins + 1 })
              .where(eq(players.id, recipientId));

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
      const turnOrderLength = session.turnOrder?.length ?? 1;
      const nextTurnIndex =
        ((session.currentTurnIndex ?? 0) + 1) % turnOrderLength;
      const isNewRound = nextTurnIndex === 0;
      const newRoundNumber = isNewRound
        ? (session.roundNumber ?? 1) + 1
        : (session.roundNumber ?? 1);

      // Draw next song from session's playlist
      const usedSongIds = new Set(session.usedSongIds ?? []);
      const songPool = session.playlistSongs ?? PLACEHOLDER_SONGS;
      let availableSongs = songPool.filter((s) => !usedSongIds.has(s.songId));
      let switchedToFallback = false;

      // If custom playlist exhausted, try fallback to default songs
      if (availableSongs.length === 0 && !session.usingFallbackPlaylist) {
        const fallbackAvailable = PLACEHOLDER_SONGS.filter(
          (s) => !usedSongIds.has(s.songId),
        );
        if (fallbackAvailable.length > 0) {
          availableSongs = fallbackAvailable;
          switchedToFallback = true;
        }
      }

      if (availableSongs.length === 0) {
        // Determine winner (player with most songs)
        const sortedPlayers = [...session.players].sort(
          (a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0),
        );
        const songExhaustionWinner = sortedPlayers[0];

        // Increment winner's wins count
        if (songExhaustionWinner) {
          await ctx.db
            .update(players)
            .set({ wins: songExhaustionWinner.wins + 1 })
            .where(eq(players.id, songExhaustionWinner.id));
        }

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
          winnerId: songExhaustionWinner?.id,
          reason: "No more songs available",
          guessWasCorrect,
          guessedName: guess?.guessedName ?? null,
          guessedArtist: guess?.guessedArtist ?? null,
        };
      }

      const nextSong =
        availableSongs[Math.floor(Math.random() * availableSongs.length)];
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
            uri: nextSong.uri,
          },
          usedSongIds: newUsedSongIds,
          turnStartedAt: new Date(),
          isStealPhase: false,
          stealPhaseEndAt: null,
          activePlayerPlacement: null,
          activePlayerGuess: null,
          stealAttempts: [],
          usingFallbackPlaylist: switchedToFallback
            ? true
            : session.usingFallbackPlaylist,
          updatedAt: new Date(),
        })
        .where(eq(gameSessions.id, session.id));

      return {
        activePlayerCorrect,
        song: session.currentSong,
        stolenBy: winningStealer,
        recipientId,
        gameEnded: false,
        nextPlayerId: newTurnOrder?.[nextTurnIndex],
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
