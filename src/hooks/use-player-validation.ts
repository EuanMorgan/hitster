"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
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
 * Uses Zustand store as source of truth for player ID.
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

  // Derive validation state from store + session
  const validationState = useMemo(() => {
    // Still loading session data
    if (!sessionData) {
      return { isValidated: false, shouldRedirect: false };
    }

    // Check if stored player matches current game
    const pinMatches = storedPin === pin || !storedPin; // Legacy: no PIN stored = assume valid
    const playerInSession = sessionData.players.some(
      (p) => p.id === storedPlayerId,
    );

    if (storedPlayerId && pinMatches && playerInSession) {
      return { isValidated: true, shouldRedirect: false };
    }

    if (storedPlayerId && !playerInSession) {
      // Player ID exists but not in this session
      return { isValidated: false, shouldRedirect: true };
    }

    if (!storedPlayerId && requirePlayer) {
      // No player ID and player is required
      return { isValidated: false, shouldRedirect: true };
    }

    // No player ID, spectator mode allowed
    return { isValidated: false, shouldRedirect: false };
  }, [sessionData, storedPlayerId, storedPin, pin, requirePlayer]);

  // Side effect: update store when validated
  useEffect(() => {
    if (validationState.isValidated && sessionData && storedPlayerId) {
      setPlayer({
        playerId: storedPlayerId,
        sessionId: sessionData.id,
        gamePin: pin,
      });
    }
  }, [
    validationState.isValidated,
    sessionData,
    storedPlayerId,
    pin,
    setPlayer,
  ]);

  // Side effect: redirect when needed
  useEffect(() => {
    if (validationState.shouldRedirect) {
      router.push(`/join?pin=${pin}`);
    }
  }, [validationState.shouldRedirect, router, pin]);

  return {
    playerId: storedPlayerId,
    isValidated: validationState.isValidated,
    isLoading: isSessionLoading,
  };
}
