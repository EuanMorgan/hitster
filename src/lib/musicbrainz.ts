import { eq } from "drizzle-orm";
import { db } from "@/db";
import { isrcYearCache } from "@/db/schema";

// MusicBrainz API has strict rate limit: 1 request per second
// Using 1100ms to be safe
const RATE_LIMIT_MS = 1100;
let lastRequestTime = 0;

// Required by MusicBrainz - they reject requests without proper User-Agent
const USER_AGENT = "Hitster/1.0 (https://github.com/hitster-game)";

type MusicBrainzRecording = {
  id: string;
  title: string;
  "first-release-date"?: string;
};

type MusicBrainzResponse = {
  recordings?: MusicBrainzRecording[];
};

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
}

/**
 * Get cached year from database
 */
export async function getCachedYear(isrc: string): Promise<number | null> {
  const cached = await db
    .select()
    .from(isrcYearCache)
    .where(eq(isrcYearCache.isrc, isrc))
    .limit(1);

  return cached[0]?.originalYear ?? null;
}

/**
 * Cache year lookup result in database
 */
export async function cacheYear(
  isrc: string,
  originalYear: number,
  spotifyYear?: number,
): Promise<void> {
  await db
    .insert(isrcYearCache)
    .values({
      isrc,
      originalYear,
      spotifyYear,
    })
    .onConflictDoNothing();
}

/**
 * Extract the earliest year from MusicBrainz recordings
 */
function extractEarliestYear(
  recordings: MusicBrainzRecording[],
): number | null {
  let earliestYear: number | null = null;

  for (const recording of recordings) {
    const dateStr = recording["first-release-date"];
    if (!dateStr) continue;

    // Date format is YYYY, YYYY-MM, or YYYY-MM-DD
    const year = Number.parseInt(dateStr.substring(0, 4), 10);
    if (!Number.isNaN(year) && (earliestYear === null || year < earliestYear)) {
      earliestYear = year;
    }
  }

  return earliestYear;
}

/**
 * Get original release year from MusicBrainz API via ISRC lookup
 * Returns null if ISRC not found or API error
 *
 * IMPORTANT: MusicBrainz has strict rate limit of 1 request/second
 */
export async function getOriginalYear(isrc: string): Promise<number | null> {
  // Check cache first
  const cachedYear = await getCachedYear(isrc);
  if (cachedYear !== null) {
    return cachedYear;
  }

  try {
    const url = `https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}?fmt=json`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        // ISRC not found in MusicBrainz
        return null;
      }
      console.error(
        `MusicBrainz API error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as MusicBrainzResponse;

    if (!data.recordings || data.recordings.length === 0) {
      return null;
    }

    const year = extractEarliestYear(data.recordings);

    // Cache result if found
    if (year !== null) {
      // Note: spotifyYear passed separately when calling from game logic
      await cacheYear(isrc, year);
    }

    return year;
  } catch (error) {
    console.error("MusicBrainz lookup failed:", error);
    return null;
  }
}

/**
 * Get original release year, with caching of result
 * Useful when you want to also store the Spotify year for comparison
 */
export async function getOriginalYearWithCache(
  isrc: string,
  spotifyYear?: number,
): Promise<number | null> {
  // Check cache first
  const cachedYear = await getCachedYear(isrc);
  if (cachedYear !== null) {
    return cachedYear;
  }

  try {
    const url = `https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}?fmt=json`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error(
        `MusicBrainz API error: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = (await response.json()) as MusicBrainzResponse;

    if (!data.recordings || data.recordings.length === 0) {
      return null;
    }

    const year = extractEarliestYear(data.recordings);

    // Cache result if found, including Spotify year for comparison
    if (year !== null) {
      await cacheYear(isrc, year, spotifyYear);
    }

    return year;
  } catch (error) {
    console.error("MusicBrainz lookup failed:", error);
    return null;
  }
}
