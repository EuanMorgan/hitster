import { vi } from "vitest";
import type {
  GameHistory,
  GameSession,
  Player,
  PlaylistSong,
  TimelineSong,
  Turn,
  User,
} from "@/db/schema";

// In-memory store for mock data
let mockUsers: User[] = [];
let mockGameSessions: GameSession[] = [];
let mockPlayers: Player[] = [];
let mockTurns: Turn[] = [];
let mockGameHistories: GameHistory[] = [];

// Reset all mock data
export function resetMockDb() {
  mockUsers = [];
  mockGameSessions = [];
  mockPlayers = [];
  mockTurns = [];
  mockGameHistories = [];
}

// Getters for mock data
export function getMockUsers() {
  return mockUsers;
}
export function getMockGameSessions() {
  return mockGameSessions;
}
export function getMockPlayers() {
  return mockPlayers;
}
export function getMockTurns() {
  return mockTurns;
}
export function getMockGameHistories() {
  return mockGameHistories;
}

// Seed functions
export function seedUser(userData: Partial<User> = {}): User {
  const user: User = {
    id:
      userData.id ??
      `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: userData.name ?? "Test User",
    email: userData.email ?? `test-${Date.now()}@example.com`,
    emailVerified: userData.emailVerified ?? false,
    image: userData.image ?? null,
    createdAt: userData.createdAt ?? new Date(),
    updatedAt: userData.updatedAt ?? new Date(),
  };
  mockUsers.push(user);
  return user;
}

export function seedGameSession(
  sessionData: Partial<GameSession> = {},
): GameSession {
  const session: GameSession = {
    id: sessionData.id ?? crypto.randomUUID(),
    pin: sessionData.pin ?? generatePin(),
    hostId: sessionData.hostId ?? mockUsers[0]?.id ?? seedUser().id,
    state: sessionData.state ?? "lobby",
    songsToWin: sessionData.songsToWin ?? 10,
    songPlayDuration: sessionData.songPlayDuration ?? 30,
    turnDuration: sessionData.turnDuration ?? 45,
    stealWindowDuration: sessionData.stealWindowDuration ?? 10,
    maxPlayers: sessionData.maxPlayers ?? 10,
    playlistUrl: sessionData.playlistUrl ?? null,
    currentTurnIndex: sessionData.currentTurnIndex ?? 0,
    turnOrder: sessionData.turnOrder ?? null,
    usedSongIds: sessionData.usedSongIds ?? [],
    currentSong: sessionData.currentSong ?? null,
    turnStartedAt: sessionData.turnStartedAt ?? null,
    roundNumber: sessionData.roundNumber ?? 1,
    stealPhase: sessionData.stealPhase ?? null,
    stealDecidePhaseEndAt: sessionData.stealDecidePhaseEndAt ?? null,
    stealPlacePhaseEndAt: sessionData.stealPlacePhaseEndAt ?? null,
    decidedStealers: sessionData.decidedStealers ?? [],
    playerSkips: sessionData.playerSkips ?? [],
    activePlayerPlacement: sessionData.activePlayerPlacement ?? null,
    activePlayerGuess: sessionData.activePlayerGuess ?? null,
    stealAttempts: sessionData.stealAttempts ?? [],
    isStealPhase: sessionData.isStealPhase ?? false,
    stealPhaseEndAt: sessionData.stealPhaseEndAt ?? null,
    playlistSongs: sessionData.playlistSongs ?? null,
    usingFallbackPlaylist: sessionData.usingFallbackPlaylist ?? false,
    yearLookupStatus: sessionData.yearLookupStatus ?? null,
    yearLookupProgress: sessionData.yearLookupProgress ?? 0,
    yearLookupTotal: sessionData.yearLookupTotal ?? 0,
    gamesPlayed: sessionData.gamesPlayed ?? 0,
    shuffleTurns: sessionData.shuffleTurns ?? false,
    createdAt: sessionData.createdAt ?? new Date(),
    updatedAt: sessionData.updatedAt ?? new Date(),
  };
  mockGameSessions.push(session);
  return session;
}

export function seedPlayer(playerData: Partial<Player> = {}): Player {
  const player: Player = {
    id: playerData.id ?? crypto.randomUUID(),
    sessionId:
      playerData.sessionId ?? mockGameSessions[0]?.id ?? seedGameSession().id,
    userId: playerData.userId ?? null,
    name: playerData.name ?? "Test Player",
    avatar: playerData.avatar ?? "🎮",
    tokens: playerData.tokens ?? 2,
    timeline: playerData.timeline ?? [],
    wins: playerData.wins ?? 0,
    isHost: playerData.isHost ?? false,
    isConnected: playerData.isConnected ?? true,
    lastSeenAt: playerData.lastSeenAt ?? new Date(),
    createdAt: playerData.createdAt ?? new Date(),
  };
  mockPlayers.push(player);
  return player;
}

export function seedTurn(turnData: Partial<Turn> = {}): Turn {
  const turn: Turn = {
    id: turnData.id ?? crypto.randomUUID(),
    sessionId:
      turnData.sessionId ?? mockGameSessions[0]?.id ?? seedGameSession().id,
    playerId: turnData.playerId ?? mockPlayers[0]?.id ?? seedPlayer().id,
    roundNumber: turnData.roundNumber ?? 1,
    songId: turnData.songId ?? "track1",
    songName: turnData.songName ?? "Bohemian Rhapsody",
    songArtist: turnData.songArtist ?? "Queen",
    songYear: turnData.songYear ?? 1975,
    placementIndex: turnData.placementIndex ?? null,
    wasCorrect: turnData.wasCorrect ?? null,
    guessedName: turnData.guessedName ?? null,
    guessedArtist: turnData.guessedArtist ?? null,
    guessWasCorrect: turnData.guessWasCorrect ?? null,
    stealAttempts: turnData.stealAttempts ?? [],
    completedAt: turnData.completedAt ?? null,
    createdAt: turnData.createdAt ?? new Date(),
  };
  mockTurns.push(turn);
  return turn;
}

export function seedGameHistory(
  historyData: Partial<GameHistory> = {},
): GameHistory {
  const history: GameHistory = {
    id: historyData.id ?? crypto.randomUUID(),
    sessionId:
      historyData.sessionId ?? mockGameSessions[0]?.id ?? seedGameSession().id,
    hostId: historyData.hostId ?? mockUsers[0]?.id ?? seedUser().id,
    winnerId: historyData.winnerId ?? null,
    finalStandings: historyData.finalStandings ?? null,
    gameData: historyData.gameData ?? null,
    completedAt: historyData.completedAt ?? new Date(),
  };
  mockGameHistories.push(history);
  return history;
}

// Helper to generate 4-character alphanumeric PIN
function generatePin(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pin = "";
  for (let i = 0; i < 4; i++) {
    pin += chars[Math.floor(Math.random() * chars.length)];
  }
  return pin;
}

// Create mock query builders for drizzle-like interface
export function createMockDb() {
  return {
    query: {
      user: {
        findMany: vi.fn(() => Promise.resolve(mockUsers)),
        findFirst: vi.fn(({ where }: { where?: unknown } = {}) =>
          Promise.resolve(mockUsers[0] ?? null),
        ),
      },
      gameSessions: {
        findMany: vi.fn(() => Promise.resolve(mockGameSessions)),
        findFirst: vi.fn(({ where }: { where?: unknown } = {}) =>
          Promise.resolve(mockGameSessions[0] ?? null),
        ),
      },
      players: {
        findMany: vi.fn(() => Promise.resolve(mockPlayers)),
        findFirst: vi.fn(({ where }: { where?: unknown } = {}) =>
          Promise.resolve(mockPlayers[0] ?? null),
        ),
      },
      turns: {
        findMany: vi.fn(() => Promise.resolve(mockTurns)),
        findFirst: vi.fn(({ where }: { where?: unknown } = {}) =>
          Promise.resolve(mockTurns[0] ?? null),
        ),
      },
      gameHistory: {
        findMany: vi.fn(() => Promise.resolve(mockGameHistories)),
        findFirst: vi.fn(({ where }: { where?: unknown } = {}) =>
          Promise.resolve(mockGameHistories[0] ?? null),
        ),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  };
}

// Helper to create a timeline song
export function createTimelineSong(
  overrides: Partial<TimelineSong> = {},
): TimelineSong {
  return {
    songId: overrides.songId ?? `song-${Date.now()}`,
    name: overrides.name ?? "Test Song",
    artist: overrides.artist ?? "Test Artist",
    year: overrides.year ?? 2000,
    addedAt: overrides.addedAt ?? new Date().toISOString(),
    uri:
      overrides.uri ??
      `spotify:track:${overrides.songId ?? `song-${Date.now()}`}`,
  };
}

// Helper to create a playlist song
export function createPlaylistSong(
  overrides: Partial<PlaylistSong> = {},
): PlaylistSong {
  const songId = overrides.songId ?? `song-${Date.now()}`;
  return {
    songId,
    name: overrides.name ?? "Test Song",
    artist: overrides.artist ?? "Test Artist",
    year: overrides.year ?? 2000,
    uri: overrides.uri ?? `spotify:track:${songId}`,
  };
}
