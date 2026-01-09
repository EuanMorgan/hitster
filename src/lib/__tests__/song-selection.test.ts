import { describe, expect, it } from "vitest";

// Mock playlist songs
function createMockPlaylistSongs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    songId: `song-${i}`,
    name: `Song ${i}`,
    artist: `Artist ${i}`,
    year: 1970 + i,
    uri: `spotify:track:${i}`,
  }));
}

// Simulates the song selection logic from game.ts
function selectAvailableSong(
  songPool: { songId: string }[],
  usedSongIds: Set<string>,
) {
  const available = songPool.filter((s) => !usedSongIds.has(s.songId));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

describe("Song Selection Logic", () => {
  it("draws 50 songs without duplicates", () => {
    const songPool = createMockPlaylistSongs(100);
    const usedSongIds = new Set<string>();
    const drawnSongs: string[] = [];

    for (let i = 0; i < 50; i++) {
      const song = selectAvailableSong(songPool, usedSongIds);
      expect(song).not.toBeNull();
      if (song) {
        drawnSongs.push(song.songId);
        usedSongIds.add(song.songId);
      }
    }

    // Verify no duplicates
    const uniqueSongs = new Set(drawnSongs);
    expect(uniqueSongs.size).toBe(50);
    expect(drawnSongs.length).toBe(50);
  });

  it("prevents drawing already-used songs", () => {
    const songPool = createMockPlaylistSongs(10);
    const usedSongIds = new Set<string>(["song-0", "song-1", "song-2"]);

    // Draw all remaining songs
    const drawnSongs: string[] = [];
    for (let i = 0; i < 7; i++) {
      const song = selectAvailableSong(songPool, usedSongIds);
      if (song) {
        drawnSongs.push(song.songId);
        usedSongIds.add(song.songId);
      }
    }

    // Verify none of the pre-used songs were drawn
    expect(drawnSongs).not.toContain("song-0");
    expect(drawnSongs).not.toContain("song-1");
    expect(drawnSongs).not.toContain("song-2");
    expect(drawnSongs.length).toBe(7);
  });

  it("returns null when all songs are used", () => {
    const songPool = createMockPlaylistSongs(5);
    const usedSongIds = new Set<string>(songPool.map((s) => s.songId));

    const song = selectAvailableSong(songPool, usedSongIds);
    expect(song).toBeNull();
  });

  it("handles fallback playlist correctly", () => {
    const customPlaylist = createMockPlaylistSongs(5);
    const fallbackPlaylist = createMockPlaylistSongs(100).map((s) => ({
      ...s,
      songId: `fallback-${s.songId}`,
    }));

    const usedSongIds = new Set<string>();
    const drawnSongs: string[] = [];

    // Use all custom playlist songs
    for (const song of customPlaylist) {
      drawnSongs.push(song.songId);
      usedSongIds.add(song.songId);
    }

    // Try to draw from custom (should return null)
    const customSong = selectAvailableSong(customPlaylist, usedSongIds);
    expect(customSong).toBeNull();

    // Fall back to fallback playlist - should work
    const fallbackSong = selectAvailableSong(fallbackPlaylist, usedSongIds);
    expect(fallbackSong).not.toBeNull();
    expect(fallbackSong?.songId.startsWith("fallback-")).toBe(true);
  });

  it("excludes songs from both playlists when falling back", () => {
    // Simulate a scenario where some songs exist in both custom and fallback
    const sharedSongId = "shared-song-123";
    const fallbackPlaylist = [
      {
        songId: sharedSongId,
        name: "Shared",
        artist: "Artist",
        year: 1990,
        uri: "uri:1",
      },
      {
        songId: "fallback-1",
        name: "Fallback 1",
        artist: "Artist",
        year: 1992,
        uri: "uri:3",
      },
    ];

    // Mark shared song as used (from custom playlist usage)
    const usedSongIds = new Set<string>([sharedSongId]);

    // Draw from fallback - should skip the shared song
    const song = selectAvailableSong(fallbackPlaylist, usedSongIds);
    expect(song).not.toBeNull();
    expect(song?.songId).toBe("fallback-1");
  });
});
