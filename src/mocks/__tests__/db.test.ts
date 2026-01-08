import { beforeEach, describe, expect, it } from "vitest";
import {
  createMockDb,
  createTimelineSong,
  getMockGameHistories,
  getMockGameSessions,
  getMockPlayers,
  getMockTurns,
  getMockUsers,
  resetMockDb,
  seedGameHistory,
  seedGameSession,
  seedPlayer,
  seedTurn,
  seedUser,
} from "../db";

describe("Database Mocks", () => {
  beforeEach(() => {
    resetMockDb();
  });

  describe("seedUser", () => {
    it("creates a user with default values", () => {
      const user = seedUser();

      expect(user.id).toBeDefined();
      expect(user.name).toBe("Test User");
      expect(user.email).toContain("@example.com");
      expect(getMockUsers()).toHaveLength(1);
    });

    it("creates a user with custom values", () => {
      const user = seedUser({
        name: "Custom User",
        email: "custom@test.com",
      });

      expect(user.name).toBe("Custom User");
      expect(user.email).toBe("custom@test.com");
    });
  });

  describe("seedGameSession", () => {
    it("creates a game session with default values", () => {
      const session = seedGameSession();

      expect(session.id).toBeDefined();
      expect(session.pin).toHaveLength(4);
      expect(session.state).toBe("lobby");
      expect(session.songsToWin).toBe(10);
      expect(getMockGameSessions()).toHaveLength(1);
    });

    it("creates a game session with custom values", () => {
      seedUser({ id: "host-123" });
      const session = seedGameSession({
        hostId: "host-123",
        state: "playing",
        songsToWin: 15,
      });

      expect(session.hostId).toBe("host-123");
      expect(session.state).toBe("playing");
      expect(session.songsToWin).toBe(15);
    });
  });

  describe("seedPlayer", () => {
    it("creates a player with default values", () => {
      const player = seedPlayer();

      expect(player.id).toBeDefined();
      expect(player.name).toBe("Test Player");
      expect(player.tokens).toBe(2);
      expect(player.timeline).toEqual([]);
      expect(getMockPlayers()).toHaveLength(1);
    });

    it("creates a player with custom values", () => {
      const session = seedGameSession();
      const timeline = [createTimelineSong({ year: 1985 })];
      const player = seedPlayer({
        sessionId: session.id,
        name: "Custom Player",
        avatar: "🎵",
        tokens: 5,
        timeline,
      });

      expect(player.sessionId).toBe(session.id);
      expect(player.name).toBe("Custom Player");
      expect(player.avatar).toBe("🎵");
      expect(player.tokens).toBe(5);
      expect(player.timeline).toEqual(timeline);
    });
  });

  describe("seedTurn", () => {
    it("creates a turn with default values", () => {
      const turn = seedTurn();

      expect(turn.id).toBeDefined();
      expect(turn.roundNumber).toBe(1);
      expect(turn.songYear).toBe(1975);
      expect(getMockTurns()).toHaveLength(1);
    });

    it("creates a turn with custom values", () => {
      const turn = seedTurn({
        roundNumber: 3,
        songName: "Custom Song",
        wasCorrect: true,
      });

      expect(turn.roundNumber).toBe(3);
      expect(turn.songName).toBe("Custom Song");
      expect(turn.wasCorrect).toBe(true);
    });
  });

  describe("seedGameHistory", () => {
    it("creates game history with default values", () => {
      const history = seedGameHistory();

      expect(history.id).toBeDefined();
      expect(history.completedAt).toBeDefined();
      expect(getMockGameHistories()).toHaveLength(1);
    });
  });

  describe("createMockDb", () => {
    it("returns a mock db object with query methods", () => {
      const mockDb = createMockDb();

      expect(mockDb.query.user.findMany).toBeDefined();
      expect(mockDb.query.gameSessions.findFirst).toBeDefined();
      expect(mockDb.insert).toBeDefined();
      expect(mockDb.update).toBeDefined();
      expect(mockDb.delete).toBeDefined();
    });

    it("query methods return seeded data", async () => {
      seedUser({ name: "Query Test User" });
      const mockDb = createMockDb();

      const users = await mockDb.query.user.findMany();
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe("Query Test User");
    });
  });

  describe("createTimelineSong", () => {
    it("creates a timeline song with default values", () => {
      const song = createTimelineSong();

      expect(song.songId).toBeDefined();
      expect(song.name).toBe("Test Song");
      expect(song.artist).toBe("Test Artist");
      expect(song.year).toBe(2000);
      expect(song.addedAt).toBeDefined();
    });

    it("creates a timeline song with custom values", () => {
      const song = createTimelineSong({
        songId: "custom-song-id",
        name: "Custom Song",
        artist: "Custom Artist",
        year: 1990,
      });

      expect(song.songId).toBe("custom-song-id");
      expect(song.name).toBe("Custom Song");
      expect(song.artist).toBe("Custom Artist");
      expect(song.year).toBe(1990);
    });
  });

  describe("resetMockDb", () => {
    it("clears all mock data", () => {
      seedUser();
      seedGameSession();
      seedPlayer();
      seedTurn();
      seedGameHistory();

      expect(getMockUsers()).toHaveLength(1);
      expect(getMockGameSessions()).toHaveLength(1);

      resetMockDb();

      expect(getMockUsers()).toHaveLength(0);
      expect(getMockGameSessions()).toHaveLength(0);
      expect(getMockPlayers()).toHaveLength(0);
      expect(getMockTurns()).toHaveLength(0);
      expect(getMockGameHistories()).toHaveLength(0);
    });
  });
});
