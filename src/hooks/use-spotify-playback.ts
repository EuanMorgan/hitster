"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

interface UseSpotifyPlaybackOptions {
  deviceId: string | null;
  onPlaybackError?: (error: string) => void;
}

interface UseSpotifyPlaybackResult {
  play: (trackUri: string, positionMs?: number) => void;
  pause: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTrackUri: string | null;
}

function isReauthRequired(error: unknown): boolean {
  if (error && typeof error === "object" && "message" in error) {
    return (error as { message: string }).message === "SPOTIFY_REAUTH_REQUIRED";
  }
  return false;
}

export function useSpotifyPlayback({
  deviceId,
  onPlaybackError,
}: UseSpotifyPlaybackOptions): UseSpotifyPlaybackResult {
  const trpc = useTRPC();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current playing URI to prevent duplicate play calls
  const currentPlayingUriRef = useRef<string | null>(null);

  // Play track mutation
  const playTrackMutation = useMutation(
    trpc.spotify.playTrack.mutationOptions(),
  );

  // Pause mutation
  const pauseMutation = useMutation(
    trpc.spotify.pausePlayback.mutationOptions(),
  );

  const handleReauth = useCallback(() => {
    signIn.social({ provider: "spotify", callbackURL: window.location.href });
  }, []);

  const play = useCallback(
    (trackUri: string, positionMs = 0) => {
      if (!deviceId) {
        console.warn("Cannot play: no device ID");
        return;
      }

      // Skip duplicate play calls for same URI
      if (trackUri === currentPlayingUriRef.current) {
        console.log(`Skipping duplicate play call for ${trackUri}`);
        return;
      }

      console.log(`Playing track: ${trackUri}`);
      currentPlayingUriRef.current = trackUri;
      setIsLoading(true);
      setError(null);

      playTrackMutation.mutate(
        { trackUri, deviceId, positionMs },
        {
          onSuccess: () => {
            setIsPlaying(true);
            setIsLoading(false);
          },
          onError: (err) => {
            console.error("Spotify play track error:", err.message);
            setIsLoading(false);
            currentPlayingUriRef.current = null; // Allow retry
            if (isReauthRequired(err)) {
              handleReauth();
            } else {
              setError(err.message);
              toast.error("Playback failed - check Spotify Premium status");
              onPlaybackError?.(err.message);
            }
          },
        },
      );
    },
    [deviceId, playTrackMutation, handleReauth, onPlaybackError],
  );

  const pause = useCallback(() => {
    if (!deviceId) {
      console.warn("Cannot pause: no device ID");
      return;
    }

    setIsLoading(false);
    pauseMutation.mutate({ deviceId });
    setIsPlaying(false);
  }, [deviceId, pauseMutation]);

  return {
    play,
    pause,
    isPlaying,
    isLoading,
    error,
    currentTrackUri: currentPlayingUriRef.current,
  };
}
