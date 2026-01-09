import type { TimelineSong } from "@/db/schema";

interface PlayerBase {
  id: string;
  timeline: TimelineSong[] | null;
  wins?: number;
}

/**
 * Sort players by timeline length descending (most songs first)
 */
export function getPlayersSortedByTimeline<T extends PlayerBase>(
  players: T[],
): T[] {
  return [...players].sort(
    (a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0),
  );
}

/**
 * Sort players by wins descending (most wins first)
 */
export function getPlayersSortedByWins<T extends PlayerBase>(
  players: T[],
): T[] {
  return [...players].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
}

/**
 * Sort players with current user first, rest in original order
 */
export function getPlayersSortedWithCurrentFirst<T extends { id: string }>(
  players: T[],
  currentPlayerId: string | null,
): T[] {
  if (!currentPlayerId) return players;
  return [...players].sort((a, b) => {
    if (a.id === currentPlayerId) return -1;
    if (b.id === currentPlayerId) return 1;
    return 0;
  });
}

/**
 * Sort timeline songs by year ascending (earliest first)
 */
export function getTimelineSortedByYear(
  timeline: TimelineSong[],
): TimelineSong[] {
  return [...timeline].sort((a, b) => a.year - b.year);
}

/**
 * Find current player from session
 */
export function getCurrentPlayer<T extends { id: string }>(
  players: T[],
  currentPlayerId: string | null,
): T | undefined {
  if (!currentPlayerId) return undefined;
  return players.find((p) => p.id === currentPlayerId);
}
