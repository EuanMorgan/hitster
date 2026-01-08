import type { Page } from "@playwright/test";
import { mockPlaylistTracks, mockSpotifyUser } from "../../src/mocks/handlers";

/**
 * Helper functions to mock API responses in Playwright E2E tests.
 * Uses Playwright's route interception instead of MSW browser worker.
 */

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export async function mockSpotifyApi(page: Page) {
  // Mock user profile
  await page.route(`${SPOTIFY_API_BASE}/me`, async (route) => {
    if (route.request().url() === `${SPOTIFY_API_BASE}/me`) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSpotifyUser),
      });
    } else {
      await route.continue();
    }
  });

  // Mock playlist tracks
  await page.route(`${SPOTIFY_API_BASE}/playlists/*/tracks*`, async (route) => {
    const url = new URL(route.request().url());
    const offset = Number.parseInt(url.searchParams.get("offset") ?? "0");
    const limit = Number.parseInt(url.searchParams.get("limit") ?? "100");

    const items = mockPlaylistTracks.slice(offset, offset + limit);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items,
        total: mockPlaylistTracks.length,
        offset,
        limit,
        next: null,
        previous: null,
      }),
    });
  });

  // Mock player controls
  await page.route(`${SPOTIFY_API_BASE}/me/player*`, async (route) => {
    const method = route.request().method();
    if (method === "PUT") {
      await route.fulfill({ status: 204 });
    } else if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          is_playing: false,
          device: {
            id: "mock-device-123",
            is_active: true,
            name: "Hitster Web Player",
          },
          item: mockPlaylistTracks[0].track,
          progress_ms: 0,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockAuthenticatedUser(page: Page, user = mockSpotifyUser) {
  // Mock the auth session endpoint
  await page.route("**/api/auth/get-session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        session: {
          id: "test-session-id",
          userId: user.id,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        user: {
          id: user.id,
          name: user.display_name,
          email: user.email,
          image: user.images[0]?.url,
        },
      }),
    });
  });
}

export async function mockUnauthenticated(page: Page) {
  await page.route("**/api/auth/get-session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ session: null, user: null }),
    });
  });
}

export async function mockTrpcEndpoint<T>(
  page: Page,
  procedureName: string,
  response: T
) {
  await page.route(`**/api/trpc/${procedureName}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        result: {
          data: response,
        },
      }),
    });
  });
}
