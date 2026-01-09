"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlayerStore } from "@/stores/player-store";

interface SessionData {
  id: string;
  players: Array<{ id: string }>;
}

interface UsePlayerValidationOptions {
  pin: string;
  sessionData: SessionData | undefined;
  isSessionLoading: boolean;
  /**
   * If true, redirects to /join when no player ID exists.
   * If false, allows spectator mode (no redirect).
   */
  requirePlayer?: boolean;
}

interface UsePlayerValidationReturn {
  playerId: string | null;
  isValidated: boolean;
  isLoading: boolean;
}

/**
 * Hook for validating player belongs to a game session.
 * Handles:
 * - Reading player ID from Zustand store
 * - Validating player exists in session
 * - Updating store with correct session data
 * - Redirecting to join page if player not found
 */
export function usePlayerValidation({
  pin,
  sessionData,
  isSessionLoading,
  requirePlayer = false,
}: UsePlayerValidationOptions): UsePlayerValidationReturn {
  const router = useRouter();

  const storedPlayerId = usePlayerStore((state) => state.playerId);
  const storedPin = usePlayerStore((state) => state.gamePin);
  const setPlayer = usePlayerStore((state) => state.setPlayer);

  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [playerValidated, setPlayerValidated] = useState(false);

  // Initial validation from store
  useEffect(() => {
    if (storedPlayerId && storedPin === pin) {
      // Stored PIN matches current game
      setCurrentPlayerId(storedPlayerId);
      setPlayerValidated(true);
    } else if (storedPlayerId && !storedPin) {
      // Legacy: no PIN stored, assume valid (backward compat)
      setCurrentPlayerId(storedPlayerId);
      setPlayerValidated(true);
    } else {
      // No player ID or wrong game - validate against session
      setCurrentPlayerId(storedPlayerId);
      setPlayerValidated(false);
    }
  }, [pin, storedPlayerId, storedPin]);

  // Validate player against session data
  useEffect(() => {
    if (!sessionData || playerValidated) return;

    const playerInSession = sessionData.players.find(
      (p) => p.id === currentPlayerId,
    );

    if (playerInSession && currentPlayerId) {
      // Player found - update store and mark validated
      setPlayer({
        playerId: currentPlayerId,
        sessionId: sessionData.id,
        gamePin: pin,
      });
      setPlayerValidated(true);
    } else if (currentPlayerId) {
      // Player ID exists but not in session - redirect to join
      router.push(`/join?pin=${pin}`);
    } else if (requirePlayer) {
      // No player ID and requirePlayer=true - redirect to join
      router.push(`/join?pin=${pin}`);
    }
    // If no player ID and requirePlayer=false, allow spectator mode
  }, [
    sessionData,
    currentPlayerId,
    playerValidated,
    pin,
    router,
    setPlayer,
    requirePlayer,
  ]);

  return {
    playerId: currentPlayerId,
    isValidated: playerValidated,
    isLoading: isSessionLoading || (!playerValidated && !!storedPlayerId),
  };
}
