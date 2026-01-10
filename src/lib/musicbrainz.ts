import { eq } from "drizzle-orm";
import { db } from "@/db";
import { isrcYearCache } from "@/db/schema";

// MusicBrainz API has strict rate limit: 1 request per second
// Using 1100ms to be safe
const RATE_LIMIT_MS = 1100;
let lastRequestTime = 0;

// Required by MusicBrainz - they reject requests without proper User-Agent
const USER_AGENT = "Hitster/1.0 (https://github.com/hitster-game)";

// TTL for negative cache results (days)
const CACHE_TTL_DAYS = {
  found: Number.POSITIVE_INFINITY,
  not_found: 60,
  no_earlier_year: 90,
};

type LookupResult = "found" | "not_found" | "no_earlier_year";

type CacheResult =
  | { status: "miss" }
  | { status: "found"; year: number }
  | { status: "not_found" }
  | { status: "no_earlier_year" };

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
 * Get cached result from database (includes negative results with TTL)
 */
export async function getCachedResult(isrc: string): Promise<CacheResult> {
  const cached = await db
    .select()
    .from(isrcYearCache)
    .where(eq(isrcYearCache.isrc, isrc))
    .limit(1);

  if (!cached[0]) return { status: "miss" };

  const { originalYear, lookupResult, createdAt } = cached[0];

  // Check TTL for negative results
  if (lookupResult !== "found") {
    const ageInDays =
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const ttl = CACHE_TTL_DAYS[lookupResult];
    if (ageInDays > ttl) return { status: "miss" }; // Expired
  }

  if (lookupResult === "found" && originalYear !== null) {
    return { status: "found", year: originalYear };
  }

  return { status: lookupResult as "not_found" | "no_earlier_year" };
}

/**
 * Cache lookup result in database
 */
async function cacheResult(
  isrc: string,
  lookupResult: LookupResult,
  originalYear: number | null,
  spotifyYear?: number,
): Promise<void> {
  await db
    .insert(isrcYearCache)
    .values({
      isrc,
      originalYear,
      spotifyYear,
      lookupResult,
    })
    .onConflictDoUpdate({
      target: isrcYearCache.isrc,
      set: {
        originalYear,
        spotifyYear,
        lookupResult,
        createdAt: new Date(),
      },
    });
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
 * Caches all results including negative ones (404s, no earlier year)
 */
export async function getOriginalYearWithCache(
  isrc: string,
  spotifyYear?: number,
): Promise<number | null> {
  // Check cache first (handles both positive and negative cached results)
  const cached = await getCachedResult(isrc);

  if (cached.status === "found") return cached.year;
  if (cached.status === "not_found" || cached.status === "no_earlier_year") {
    return null;
  }

  // Cache miss - do API call
  try {
    const url = `https://musicbrainz.org/ws/2/isrc/${encodeURIComponent(isrc)}?fmt=json`;
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        await cacheResult(isrc, "not_found", null, spotifyYear);
        return null;
      }
      console.error(
        `MusicBrainz API error: ${response.status} ${response.statusText}`,
      );
      // Don't cache transient errors
      return null;
    }

    const data = (await response.json()) as MusicBrainzResponse;

    if (!data.recordings || data.recordings.length === 0) {
      await cacheResult(isrc, "not_found", null, spotifyYear);
      return null;
    }

    const year = extractEarliestYear(data.recordings);

    if (year === null || (spotifyYear && year >= spotifyYear)) {
      // MusicBrainz year is null or not earlier than Spotify - cache as no_earlier_year
      await cacheResult(isrc, "no_earlier_year", year, spotifyYear);
      return null;
    }

    // Found a valid earlier year
    await cacheResult(isrc, "found", year, spotifyYear);
    return year;
  } catch (error) {
    console.error("MusicBrainz lookup failed:", error);
    // Network errors - don't cache (transient)
    return null;
  }
}

/**
 * @deprecated Use getOriginalYearWithCache instead
 */
export async function getOriginalYear(isrc: string): Promise<number | null> {
  return getOriginalYearWithCache(isrc);
}

/**
 * @deprecated Use getCachedResult instead
 */
export async function getCachedYear(isrc: string): Promise<number | null> {
  const result = await getCachedResult(isrc);
  return result.status === "found" ? result.year : null;
}
