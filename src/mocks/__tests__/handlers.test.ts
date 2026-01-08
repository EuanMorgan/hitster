import { describe, expect, it } from "vitest";
import { mockPlaylist, mockPlaylistTracks, mockSpotifyUser } from "../handlers";

describe("Spotify API Mocks", () => {
  describe("GET /me", () => {
    it("returns mock user profile", async () => {
      const response = await fetch("https://api.spotify.com/v1/me");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockSpotifyUser);
      expect(data.display_name).toBe("Test User");
      expect(data.email).toBe("test@example.com");
    });
  });

  describe("GET /playlists/:playlistId", () => {
    it("returns mock playlist", async () => {
      const response = await fetch(
        "https://api.spotify.com/v1/playlists/test-playlist-123",
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("test-playlist-123");
      expect(data.name).toBe(mockPlaylist.name);
    });
  });

  describe("GET /playlists/:playlistId/tracks", () => {
    it("returns mock playlist tracks", async () => {
      const response = await fetch(
        "https://api.spotify.com/v1/playlists/test-playlist-123/tracks",
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(mockPlaylistTracks.length);
      expect(data.total).toBe(mockPlaylistTracks.length);
    });

    it("supports pagination parameters", async () => {
      const response = await fetch(
        "https://api.spotify.com/v1/playlists/test-playlist-123/tracks?offset=2&limit=2",
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.offset).toBe(2);
      expect(data.limit).toBe(2);
    });
  });

  describe("PUT /me/player", () => {
    it("returns 204 for transfer playback", async () => {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        body: JSON.stringify({ device_ids: ["device-123"] }),
      });

      expect(response.status).toBe(204);
    });
  });

  describe("PUT /me/player/play", () => {
    it("returns 204 for start playback", async () => {
      const response = await fetch(
        "https://api.spotify.com/v1/me/player/play",
        {
          method: "PUT",
          body: JSON.stringify({ uris: ["spotify:track:track1"] }),
        },
      );

      expect(response.status).toBe(204);
    });
  });

  describe("PUT /me/player/pause", () => {
    it("returns 204 for pause playback", async () => {
      const response = await fetch(
        "https://api.spotify.com/v1/me/player/pause",
        {
          method: "PUT",
        },
      );

      expect(response.status).toBe(204);
    });
  });

  describe("GET /me/player", () => {
    it("returns playback state", async () => {
      const response = await fetch("https://api.spotify.com/v1/me/player");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.device).toBeDefined();
      expect(data.device.name).toBe("Hitster Web Player");
    });
  });
});
