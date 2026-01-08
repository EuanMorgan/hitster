import { expect, test } from "@playwright/test";
import {
  mockSpotifyApi,
  mockAuthenticatedUser,
  mockUnauthenticated,
} from "./helpers/mock-api";
import { mockSpotifyUser, mockPlaylistTracks } from "../src/mocks/handlers";

test.describe("Mock API Integration", () => {
  test("can mock Spotify API endpoints via page routes", async ({ page }) => {
    await mockSpotifyApi(page);

    // Navigate to page first (routes only work after navigation setup)
    await page.goto("/");

    // Make a request through page.evaluate to use the page's fetch
    const data = await page.evaluate(async () => {
      const response = await fetch(
        "https://api.spotify.com/v1/playlists/test123/tracks"
      );
      return response.json();
    });

    expect(data.items).toBeDefined();
    expect(data.items.length).toBe(mockPlaylistTracks.length);
  });

  test("can mock authenticated session", async ({ page }) => {
    await mockAuthenticatedUser(page);
    await page.goto("/");

    // Make a request through the page context
    const data = await page.evaluate(async () => {
      const response = await fetch("/api/auth/get-session");
      return response.json();
    });

    expect(data.user).toBeDefined();
    expect(data.user.name).toBe(mockSpotifyUser.display_name);
  });

  test("can mock unauthenticated session", async ({ page }) => {
    await mockUnauthenticated(page);
    await page.goto("/");

    // Make a request through the page context
    const data = await page.evaluate(async () => {
      const response = await fetch("/api/auth/get-session");
      return response.json();
    });

    expect(data.user).toBeNull();
    expect(data.session).toBeNull();
  });
});
