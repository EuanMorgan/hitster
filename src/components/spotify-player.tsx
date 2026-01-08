"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
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
}

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
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
}: SpotifyPlayerProps) {
  const trpc = useTRPC();
  const playerRef = useRef<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number | null>(null);

  // Get access token from server
  const { data: tokenData, error: tokenError } = useQuery(
    trpc.spotify.getAccessToken.queryOptions(),
  );

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
        getOAuthToken: (cb) => {
          cb(tokenData.accessToken);
        },
        volume: 0.5,
      });

      // Error handling
      player.addListener("initialization_error", ({ message }) => {
        setError(`Initialization error: ${message}`);
        onPlaybackError?.(message);
      });

      player.addListener("authentication_error", ({ message }) => {
        setError(`Authentication error: ${message}`);
        onPlaybackError?.(message);
      });

      player.addListener("account_error", ({ message }) => {
        setError(`Account error: ${message}. You need Spotify Premium.`);
        onPlaybackError?.(message);
      });

      player.addListener("playback_error", ({ message }) => {
        setError(`Playback error: ${message}`);
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
    onPlaybackStopped, // Transfer playback to this device
    transferMutation.mutate,
  ]);

  // Handle play/pause based on shouldPlay prop
  useEffect(() => {
    if (!isReady || !deviceId || !trackUri) return;

    if (shouldPlay && !isPlaying) {
      // Start playback
      playTrackMutation.mutate(
        { trackUri, deviceId },
        {
          onSuccess: () => {
            playbackStartTimeRef.current = Date.now();
            setIsPlaying(true);
          },
          onError: (err) => {
            setError(err.message);
            onPlaybackError?.(err.message);
          },
        },
      );
    } else if (!shouldPlay && isPlaying) {
      // Pause playback
      pauseMutation.mutate({ deviceId });
    }
  }, [
    shouldPlay,
    isReady,
    deviceId,
    trackUri,
    isPlaying,
    onPlaybackError, // Pause playback
    pauseMutation.mutate, // Start playback
    playTrackMutation.mutate,
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

  // Reset position when track changes
  useEffect(() => {
    setCurrentPosition(0);
    playbackStartTimeRef.current = null;
  }, []);

  // Handle token errors
  useEffect(() => {
    if (tokenError) {
      setError("Failed to get Spotify access token. Please re-authenticate.");
      onPlaybackError?.("Token error");
    }
  }, [tokenError, onPlaybackError]);

  if (!isHost) {
    return null; // Non-hosts don't render the player
  }

  const progressPercent =
    durationMs > 0 ? (currentPosition / durationMs) * 100 : 0;
  const elapsedSeconds = Math.floor(currentPosition / 1000);
  const totalSeconds = Math.floor(durationMs / 1000);

  return (
    <div className="bg-zinc-900 rounded-lg p-4 text-white">
      {error ? (
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
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">
              {isPlaying ? "🎵 Now Playing" : "⏸️ Paused"}
            </span>
            <span className="text-zinc-300 font-mono">
              {elapsedSeconds}s / {totalSeconds}s
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>

          {/* Mystery song indicator */}
          <div className="text-center text-zinc-400 text-sm">
            🎶 Mystery Song
          </div>
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
