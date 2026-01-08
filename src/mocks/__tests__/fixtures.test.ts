import { describe, expect, it } from "vitest";
import { avatarPresets, fixtures } from "../fixtures";

describe("Fixtures", () => {
  describe("users", () => {
    it("has host user with valid properties", () => {
      const host = fixtures.users.host;

      expect(host.id).toBe("host-user-001");
      expect(host.name).toBe("Test Host");
      expect(host.email).toBe("host@example.com");
      expect(host.emailVerified).toBe(true);
    });

    it("has player users", () => {
      expect(fixtures.users.player1).toBeDefined();
      expect(fixtures.users.player2).toBeDefined();
    });
  });

  describe("gameSessions", () => {
    it("has lobby session", () => {
      const lobby = fixtures.gameSessions.lobby;

      expect(lobby.state).toBe("lobby");
      expect(lobby.pin).toBe("ABCD");
      expect(lobby.hostId).toBe("host-user-001");
    });

    it("has playing session", () => {
      const playing = fixtures.gameSessions.playing;

      expect(playing.state).toBe("playing");
      expect(playing.turnOrder).toHaveLength(3);
      expect(playing.usedSongIds).toHaveLength(2);
    });

    it("has finished session", () => {
      const finished = fixtures.gameSessions.finished;

      expect(finished.state).toBe("finished");
    });
  });

  describe("players", () => {
    it("has host player", () => {
      const hostPlayer = fixtures.players.hostPlayer;

      expect(hostPlayer.isHost).toBe(true);
      expect(hostPlayer.userId).toBe("host-user-001");
    });

    it("has guest players without user IDs", () => {
      expect(fixtures.players.guestPlayer1.userId).toBeNull();
      expect(fixtures.players.guestPlayer2.userId).toBeNull();
    });

    it("has disconnected player", () => {
      expect(fixtures.players.disconnectedPlayer.isConnected).toBe(false);
    });
  });

  describe("timelineSongs", () => {
    it("has songs from different years", () => {
      const years = [
        fixtures.timelineSongs.song1968.year,
        fixtures.timelineSongs.song1975.year,
        fixtures.timelineSongs.song1983.year,
        fixtures.timelineSongs.song1991.year,
        fixtures.timelineSongs.song2010.year,
      ];

      expect(years).toEqual([1968, 1975, 1983, 1991, 2010]);
    });
  });

  describe("turns", () => {
    it("has correct placement turn", () => {
      expect(fixtures.turns.correctPlacement.wasCorrect).toBe(true);
    });

    it("has incorrect placement turn", () => {
      expect(fixtures.turns.incorrectPlacement.wasCorrect).toBe(false);
    });

    it("has turn with steal attempt", () => {
      const turn = fixtures.turns.withStealAttempt;
      expect(turn.stealAttempts).toHaveLength(1);
      expect(turn.stealAttempts[0].wasCorrect).toBe(true);
    });

    it("has in-progress turn", () => {
      const turn = fixtures.turns.inProgress;
      expect(turn.completedAt).toBeNull();
      expect(turn.wasCorrect).toBeNull();
    });
  });

  describe("stealAttempts", () => {
    it("has successful steal attempt", () => {
      expect(fixtures.stealAttempts.successful.wasCorrect).toBe(true);
    });

    it("has failed steal attempt", () => {
      expect(fixtures.stealAttempts.failed.wasCorrect).toBe(false);
    });
  });

  describe("playerStandings", () => {
    it("winner has highest timeline count", () => {
      const winner = fixtures.playerStandings.winner;
      const second = fixtures.playerStandings.secondPlace;
      const third = fixtures.playerStandings.thirdPlace;

      expect(winner.timelineCount).toBeGreaterThan(second.timelineCount);
      expect(second.timelineCount).toBeGreaterThan(third.timelineCount);
    });
  });

  describe("spotify fixtures", () => {
    it("has track fixture with required fields", () => {
      const track = fixtures.spotify.track;

      expect(track.id).toBeDefined();
      expect(track.name).toBeDefined();
      expect(track.artists).toHaveLength(1);
      expect(track.album.release_date).toBeDefined();
    });

    it("has user fixture", () => {
      const user = fixtures.spotify.user;

      expect(user.display_name).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.product).toBe("premium");
    });
  });

  describe("avatarPresets", () => {
    it("has at least 20 avatar options", () => {
      expect(avatarPresets.length).toBeGreaterThanOrEqual(20);
    });

    it("contains emoji characters", () => {
      avatarPresets.forEach((avatar) => {
        expect(avatar.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
