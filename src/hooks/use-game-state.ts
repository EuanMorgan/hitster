import { useMemo } from "react";
import type { TimelineSong } from "@/db/schema";
import { getCurrentPlayer } from "@/lib/game-selectors";

interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  tokens: number;
  timeline: TimelineSong[] | null;
  isConnected: boolean;
}

interface StealAttempt {
  playerId: string;
  placementIndex: number;
}

interface SessionData {
  hostId: string;
  state: "lobby" | "playing" | "finished";
  currentPlayerId: string | null;
  players: Player[];
  stealPhase: "decide" | "place" | null;
  decidedStealers: string[];
  playerSkips: string[];
  stealAttempts: StealAttempt[];
  hostIsConnected: boolean;
}

interface UseGameStateParams {
  session: SessionData | null | undefined;
  currentPlayerId: string | null | undefined;
  authUserId: string | null | undefined;
}

interface UseGameStateResult {
  // Player info
  currentPlayer: Player | undefined;
  myPlayer: Player | undefined;
  isHost: boolean;
  isMyTurn: boolean;

  // Steal phase state
  stealPhase: "decide" | "place" | null;
  isDecidePhase: boolean;
  isPlacePhase: boolean;
  isStealPhase: boolean;
  decidedStealers: string[];
  playerSkips: string[];
  hasDecided: boolean;
  hasAlreadyStolen: boolean;
  totalEligible: number;
  decidedCount: number;

  // Connection state
  hostDisconnected: boolean;
}

export function useGameState({
  session,
  currentPlayerId,
  authUserId,
}: UseGameStateParams): UseGameStateResult {
  return useMemo(() => {
    const players = session?.players ?? [];
    const sessionCurrentPlayerId = session?.currentPlayerId ?? null;

    // Player lookups
    const currentPlayer = getCurrentPlayer(players, sessionCurrentPlayerId);
    const myPlayer = getCurrentPlayer(players, currentPlayerId ?? null);

    // Basic state
    const isHost = authUserId === session?.hostId;
    const isMyTurn = currentPlayerId === sessionCurrentPlayerId;

    // Two-phase steal system
    const stealPhase = session?.stealPhase ?? null;
    const isDecidePhase = stealPhase === "decide";
    const isPlacePhase = stealPhase === "place";
    const isStealPhase = stealPhase !== null;

    // Steal phase participants
    const decidedStealers = session?.decidedStealers ?? [];
    const playerSkips = session?.playerSkips ?? [];
    const hasDecided =
      decidedStealers.includes(currentPlayerId ?? "") ||
      playerSkips.includes(currentPlayerId ?? "");
    const hasAlreadyStolen = (session?.stealAttempts ?? []).some(
      (a) => a.playerId === currentPlayerId,
    );

    // Eligible count (all non-active players)
    const totalEligible = players.length - 1 > 0 ? players.length - 1 : 0;
    const decidedCount = decidedStealers.length + playerSkips.length;

    // Host connection state
    const hostDisconnected =
      session?.state === "playing" && session?.hostIsConnected === false;

    return {
      currentPlayer,
      myPlayer,
      isHost,
      isMyTurn,
      stealPhase,
      isDecidePhase,
      isPlacePhase,
      isStealPhase,
      decidedStealers,
      playerSkips,
      hasDecided,
      hasAlreadyStolen,
      totalEligible,
      decidedCount,
      hostDisconnected,
    };
  }, [session, currentPlayerId, authUserId]);
}
