"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

interface SpotifyPlayerProps {
  isHost: boolean;
  trackUri?: string | null;
  shouldPlay: boolean;
  durationMs: number;
  onPlaybackStarted?: () => void;
  onPlaybackStopped?: () => void;
  onPlaybackError?: (error: string) => void;
  onDeviceReady?: (deviceId: string) => void;
  onPositionChange?: (positionMs: number) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

function isReauthRequired(error: unknown): boolean {
  if (error && typeof error === "object" && "message" in error) {
    return (error as { message: string }).message === "SPOTIFY_REAUTH_REQUIRED";
  }
  return false;
}

export function SpotifyPlayer({
  isHost,
  trackUri,
  shouldPlay,
  durationMs,
  onPlaybackStarted,
  onPlaybackStopped,
  onPlaybackError,
  onDeviceReady,
  onPositionChange,
  onLoadingChange,
}: SpotifyPlayerProps) {
  const trpc = useTRPC();
  const playerRef = useRef<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number | null>(null);

  // Get access token from server
  const {
    data: tokenData,
    error: tokenError,
    refetch: refetchToken,
  } = useQuery(trpc.spotify.getAccessToken.queryOptions());

  // Handle re-auth redirect
  const handleReauth = useCallback(() => {
    setNeedsReauth(true);
    signIn.social({ provider: "spotify", callbackURL: window.location.href });
  }, []);

  // Check token error for reauth requirement
  useEffect(() => {
    if (tokenError && isReauthRequired(tokenError)) {
      handleReauth();
    }
  }, [tokenError, handleReauth]);

  // Emit loading state changes to parent
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // Play track mutation
  const playTrackMutation = useMutation(
    trpc.spotify.playTrack.mutationOptions(),
  );

  // Pause mutation
  const pauseMutation = useMutation(
    trpc.spotify.pausePlayback.mutationOptions(),
  );

  // Transfer playback mutation
  const transferMutation = useMutation(
    trpc.spotify.transferPlayback.mutationOptions(),
  );

  // Initialize the Spotify Web Playback SDK
  useEffect(() => {
    if (!isHost || !tokenData?.accessToken) return;

    // Load the Spotify SDK script
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: "Hitster Game",
        getOAuthToken: async (cb) => {
          // Fetch fresh token on each call (SDK calls this when token expires)
          const result = await refetchToken();
          if (result.data?.accessToken) {
            cb(result.data.accessToken);
          } else if (result.error && isReauthRequired(result.error)) {
            handleReauth();
          }
        },
        volume: 0.5,
      });

      // Error handling - show toast and log to console per PRD
      player.addListener("initialization_error", ({ message }) => {
        console.error("Spotify initialization error:", message);
        setError(`Initialization error: ${message}`);
        toast.error("Playback failed - check Spotify Premium status");
        onPlaybackError?.(message);
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("Spotify authentication error:", message);
        setError(`Authentication error: ${message}`);
        toast.error("Spotify authentication failed - reconnecting...");
        onPlaybackError?.(message);
        handleReauth();
      });

      player.addListener("account_error", ({ message }) => {
        console.error("Spotify account error:", message);
        setError(`Account error: ${message}. You need Spotify Premium.`);
        toast.error("Playback failed - check Spotify Premium status");
        onPlaybackError?.(message);
      });

      player.addListener("playback_error", ({ message }) => {
        console.error("Spotify playback error:", message);
        setError(`Playback error: ${message}`);
        toast.error("Playback failed - check Spotify Premium status");
        onPlaybackError?.(message);
      });

      // Ready
      player.addListener("ready", ({ device_id }) => {
        console.log("Spotify player ready with device ID:", device_id);
        setDeviceId(device_id);
        setIsReady(true);
        onDeviceReady?.(device_id);

        // Transfer playback to this device
        transferMutation.mutate({ deviceId: device_id });
      });

      // Not ready
      player.addListener("not_ready", ({ device_id }) => {
        console.log("Device has gone offline:", device_id);
        setIsReady(false);
      });

      // State changed
      player.addListener("player_state_changed", (state) => {
        if (!state) return;

        setIsPlaying(!state.paused);
        if (!state.paused) {
          onPlaybackStarted?.();
        } else {
          onPlaybackStopped?.();
        }
      });

      player.connect();
      playerRef.current = player;
    };

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
      script.remove();
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [
    isHost,
    tokenData?.accessToken,
    onDeviceReady,
    onPlaybackError,
    onPlaybackStarted,
    onPlaybackStopped,
    transferMutation.mutate,
    refetchToken,
    handleReauth,
  ]);

  // Track position when paused to enable resume
  const pausedPositionRef = useRef<number>(0);

  // Track URI currently playing to prevent duplicate play calls
  const currentPlayingUriRef = useRef<string | null>(null);

  // Handle play/pause based on shouldPlay prop
  useEffect(() => {
    if (!isReady || !deviceId || !trackUri) return;

    const trackChanged = trackUri !== currentPlayingUriRef.current;

    // Play only if track changed - skip duplicate play calls for same URI
    if (shouldPlay && trackChanged) {
      console.log(`Playing track: ${trackUri}`);
      currentPlayingUriRef.current = trackUri;
      pausedPositionRef.current = 0;
      // Set loading state while buffering
      setIsLoading(true);
      playTrackMutation.mutate(
        { trackUri, deviceId, positionMs: 0 },
        {
          onSuccess: () => {
            playbackStartTimeRef.current = Date.now();
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
    } else if (shouldPlay && !trackChanged) {
      // Same track, already playing or should be - skip duplicate call
      console.log(`Skipping duplicate play call for ${trackUri}`);
    } else if (!shouldPlay && isPlaying) {
      pausedPositionRef.current = currentPosition;
      setIsLoading(false);
      pauseMutation.mutate({ deviceId });
    } else if (!shouldPlay && currentPlayingUriRef.current) {
      // Clear current playing URI when playback should stop (e.g., new turn starting)
      currentPlayingUriRef.current = null;
    }
  }, [
    shouldPlay,
    isReady,
    deviceId,
    trackUri,
    isPlaying,
    currentPosition,
    onPlaybackError,
    pauseMutation.mutate,
    playTrackMutation.mutate,
    handleReauth,
  ]);

  // Track position and auto-stop after duration
  useEffect(() => {
    if (!isPlaying || !playbackStartTimeRef.current) {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
      return;
    }

    positionIntervalRef.current = setInterval(() => {
      if (!playbackStartTimeRef.current) return;

      const elapsed = Date.now() - playbackStartTimeRef.current;
      setCurrentPosition(elapsed);
      onPositionChange?.(elapsed);

      // Auto-stop after duration
      if (elapsed >= durationMs && deviceId) {
        pauseMutation.mutate({ deviceId });
        playbackStartTimeRef.current = null;
        setCurrentPosition(durationMs);
      }
    }, 100);

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
    };
  }, [isPlaying, durationMs, deviceId, onPositionChange, pauseMutation.mutate]);

  // Track previous URI for resetting position state
  const prevTrackUriRef = useRef(trackUri);
  useEffect(() => {
    if (trackUri !== prevTrackUriRef.current) {
      setCurrentPosition(0);
      playbackStartTimeRef.current = null;
      pausedPositionRef.current = 0;
      prevTrackUriRef.current = trackUri;
    }
  });

  // Handle non-reauth token errors
  useEffect(() => {
    if (tokenError && !isReauthRequired(tokenError)) {
      setError("Failed to get Spotify access token. Please re-authenticate.");
      onPlaybackError?.("Token error");
    }
  }, [tokenError, onPlaybackError]);

  if (!isHost) {
    return null; // Non-hosts don't render the player
  }

  return (
    <div className="bg-zinc-900 rounded-lg p-4 text-white">
      {needsReauth ? (
        <div className="flex items-center gap-2 text-amber-400">
          <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full" />
          <span>Redirecting to Spotify login...</span>
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm">
          ⚠️ {error}
          <p className="text-xs text-zinc-400 mt-1">
            Playback requires Spotify Premium
          </p>
        </div>
      ) : !isReady ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full" />
          <span>Connecting to Spotify...</span>
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-amber-400">
          <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full" />
          <span>Loading song...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400">
            {isPlaying ? "🎵 Now Playing" : "⏸️ Paused"}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400">🎶 Mystery Song</span>
        </div>
      )}
    </div>
  );
}

// Export a hook to control playback from parent components
export function useSpotifyPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);

  return {
    isPlaying,
    deviceId,
    play,
    pause,
    toggle,
    setDeviceId,
    setIsPlaying,
  };
}
