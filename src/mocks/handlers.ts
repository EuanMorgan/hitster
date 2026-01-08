import { HttpResponse, http } from "msw";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_BASE = "https://accounts.spotify.com";

// Mock Spotify playlist tracks
export const mockPlaylistTracks = [
  {
    track: {
      id: "track1",
      name: "Bohemian Rhapsody",
      artists: [{ name: "Queen" }],
      album: {
        release_date: "1975-10-31",
        images: [{ url: "https://example.com/album1.jpg" }],
      },
      uri: "spotify:track:track1",
      duration_ms: 354000,
    },
  },
  {
    track: {
      id: "track2",
      name: "Billie Jean",
      artists: [{ name: "Michael Jackson" }],
      album: {
        release_date: "1983-01-02",
        images: [{ url: "https://example.com/album2.jpg" }],
      },
      uri: "spotify:track:track2",
      duration_ms: 294000,
    },
  },
  {
    track: {
      id: "track3",
      name: "Smells Like Teen Spirit",
      artists: [{ name: "Nirvana" }],
      album: {
        release_date: "1991-09-10",
        images: [{ url: "https://example.com/album3.jpg" }],
      },
      uri: "spotify:track:track3",
      duration_ms: 301000,
    },
  },
  {
    track: {
      id: "track4",
      name: "Hey Jude",
      artists: [{ name: "The Beatles" }],
      album: {
        release_date: "1968-08-26",
        images: [{ url: "https://example.com/album4.jpg" }],
      },
      uri: "spotify:track:track4",
      duration_ms: 431000,
    },
  },
  {
    track: {
      id: "track5",
      name: "Rolling in the Deep",
      artists: [{ name: "Adele" }],
      album: {
        release_date: "2010-11-29",
        images: [{ url: "https://example.com/album5.jpg" }],
      },
      uri: "spotify:track:track5",
      duration_ms: 228000,
    },
  },
];

// Mock Spotify user profile
export const mockSpotifyUser = {
  id: "test-user-123",
  display_name: "Test User",
  email: "test@example.com",
  images: [{ url: "https://example.com/avatar.jpg" }],
  country: "US",
  product: "premium",
};

// Mock Spotify playlist
export const mockPlaylist = {
  id: "playlist123",
  name: "Test Playlist",
  description: "A test playlist for Hitster",
  tracks: {
    total: mockPlaylistTracks.length,
    items: mockPlaylistTracks,
  },
};

// Spotify API handlers
export const spotifyHandlers = [
  // Get current user profile
  http.get(`${SPOTIFY_API_BASE}/me`, () => {
    return HttpResponse.json(mockSpotifyUser);
  }),

  // Get playlist
  http.get(`${SPOTIFY_API_BASE}/playlists/:playlistId`, ({ params }) => {
    return HttpResponse.json({
      ...mockPlaylist,
      id: params.playlistId,
    });
  }),

  // Get playlist tracks
  http.get(
    `${SPOTIFY_API_BASE}/playlists/:playlistId/tracks`,
    ({ request }) => {
      const url = new URL(request.url);
      const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
      const limit = Number.parseInt(url.searchParams.get("limit") ?? "100", 10);

      const items = mockPlaylistTracks.slice(offset, offset + limit);
      return HttpResponse.json({
        items,
        total: mockPlaylistTracks.length,
        offset,
        limit,
        next:
          offset + limit < mockPlaylistTracks.length
            ? `${SPOTIFY_API_BASE}/playlists/playlist123/tracks?offset=${offset + limit}&limit=${limit}`
            : null,
        previous: null,
      });
    },
  ),

  // Transfer playback
  http.put(`${SPOTIFY_API_BASE}/me/player`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Start playback
  http.put(`${SPOTIFY_API_BASE}/me/player/play`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Pause playback
  http.put(`${SPOTIFY_API_BASE}/me/player/pause`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Get playback state
  http.get(`${SPOTIFY_API_BASE}/me/player`, () => {
    return HttpResponse.json({
      is_playing: false,
      device: {
        id: "mock-device-123",
        is_active: true,
        name: "Hitster Web Player",
        type: "Computer",
        volume_percent: 50,
      },
      item: mockPlaylistTracks[0].track,
      progress_ms: 0,
    });
  }),

  // Token refresh
  http.post(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, () => {
    return HttpResponse.json({
      access_token: "mock-access-token-refreshed",
      token_type: "Bearer",
      expires_in: 3600,
      scope:
        "streaming user-read-email user-read-private playlist-read-private",
    });
  }),
];

// All handlers
export const handlers = [...spotifyHandlers];
