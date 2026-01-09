"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

// Module-level singleton state
let sdkInitialized = false;
let sdkScript: HTMLScriptElement | null = null;

interface UseSpotifyPlayerOptions {
  enabled: boolean;
  trackUri: string | null;
  shouldPlay: boolean;
  onPlaybackStarted?: () => void;
  onPlaybackStopped?: () => void;
  onError?: (error: string) => void;
}

interface UseSpotifyPlayerResult {
  isReady: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  needsReauth: boolean;
  togglePlayback: () => void;
}

function isReauthRequired(error: unknown): boolean {
  if (error && typeof error === "object" && "message" in error) {
    return (error as { message: string }).message === "SPOTIFY_REAUTH_REQUIRED";
  }
  return false;
}

export function useSpotifyPlayer({
  enabled,
  trackUri,
  shouldPlay,
  onPlaybackStarted,
  onPlaybackStopped,
  onError,
}: UseSpotifyPlayerOptions): UseSpotifyPlayerResult {
  const trpc = useTRPC();
  const playerRef = useRef<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // SDK-derived state (source of truth)
  const [isPlaying, setIsPlaying] = useState(false);

  // Track previous state for transition detection
  const prevStateRef = useRef<{ trackUri: string | null; shouldPlay: boolean }>({
    trackUri: null,
    shouldPlay: false,
  });

  // Stable callback refs
  const callbacksRef = useRef({ onPlaybackStarted, onPlaybackStopped, onError });
  useEffect(() => {
    callbacksRef.current = { onPlaybackStarted, onPlaybackStopped, onError };
  });

  // Token query
  const {
    data: tokenData,
    error: tokenError,
    refetch: refetchToken,
  } = useQuery(trpc.spotify.getAccessToken.queryOptions());

  const hasToken = !!tokenData?.accessToken;

  // Only mutation we need - starting a new track
  const playTrackMutation = useMutation(
    trpc.spotify.playTrack.mutationOptions()
  );
  const transferMutation = useMutation(
    trpc.spotify.transferPlayback.mutationOptions()
  );

  // Handle token errors
  useEffect(() => {
    if (tokenError && isReauthRequired(tokenError)) {
      setNeedsReauth(true);
      signIn.social({ provider: "spotify", callbackURL: window.location.href });
    } else if (tokenError) {
      setError("Failed to get Spotify access token. Please re-authenticate.");
      callbacksRef.current.onError?.("Token error");
    }
  }, [tokenError]);

  // SDK initialization
  useEffect(() => {
    if (!enabled || !hasToken) return;
    if (sdkInitialized && playerRef.current) return;

    const initPlayer = () => {
      if (playerRef.current) return;

      const player = new window.Spotify.Player({
        name: "Hitster Game",
        getOAuthToken: async (cb) => {
          const result = await refetchToken();
          if (result.data?.accessToken) {
            cb(result.data.accessToken);
          } else if (result.error && isReauthRequired(result.error)) {
            setNeedsReauth(true);
            signIn.social({
              provider: "spotify",
              callbackURL: window.location.href,
            });
          }
        },
        volume: 0.5,
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("Spotify initialization error:", message);
        setError(`Initialization error: ${message}`);
        callbacksRef.current.onError?.(message);
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("Spotify authentication error:", message);
        setError(`Authentication error: ${message}`);
        setNeedsReauth(true);
        signIn.social({
          provider: "spotify",
          callbackURL: window.location.href,
        });
      });

      player.addListener("account_error", ({ message }) => {
        console.error("Spotify account error:", message);
        setError(`Account error: ${message}. You need Spotify Premium.`);
        callbacksRef.current.onError?.(message);
      });

      player.addListener("playback_error", ({ message }) => {
        console.error("Spotify playback error:", message);
        setError(`Playback error: ${message}`);
        callbacksRef.current.onError?.(message);
      });

      player.addListener("ready", ({ device_id }) => {
        console.log("Spotify player ready with device ID:", device_id);
        setDeviceId(device_id);
        setIsReady(true);
        transferMutation.mutate({ deviceId: device_id });
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.log("Device has gone offline:", device_id);
        setIsReady(false);
      });

      // KEY: SDK state is source of truth for playback state
      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        const nowPlaying = !state.paused;
        setIsPlaying((prev) => {
          if (!prev && nowPlaying) callbacksRef.current.onPlaybackStarted?.();
          if (prev && !nowPlaying) callbacksRef.current.onPlaybackStopped?.();
          return nowPlaying;
        });
      });

      player.connect();
      playerRef.current = player;
      sdkInitialized = true;
    };

    if (!sdkScript) {
      sdkScript = document.createElement("script");
      sdkScript.src = "https://sdk.scdn.co/spotify-player.js";
      sdkScript.async = true;
      document.body.appendChild(sdkScript);
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    } else if (window.Spotify) {
      initPlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        sdkInitialized = false;
      }
    };
  }, [enabled, hasToken, refetchToken, transferMutation.mutate]);

  // Playback control effect - explicit state transitions
  useEffect(() => {
    if (!isReady || !deviceId) return;

    const player = playerRef.current;
    if (!player) return;

    const prev = prevStateRef.current;
    const curr = { trackUri, shouldPlay };
    prevStateRef.current = curr;

    const trackChanged = curr.trackUri !== prev.trackUri;
    const playingChanged = curr.shouldPlay !== prev.shouldPlay;

    // Case 1: New track + should play -> start new track via API
    if (curr.trackUri && curr.shouldPlay && trackChanged) {
      console.log(`Playing new track: ${curr.trackUri}`);
      setIsLoading(true);
      playTrackMutation.mutate(
        { trackUri: curr.trackUri, deviceId, positionMs: 0 },
        {
          onSuccess: () => setIsLoading(false),
          onError: (err) => {
            console.error("Failed to play track:", err.message);
            setIsLoading(false);
            setError(err.message);
            callbacksRef.current.onError?.(err.message);
          },
        }
      );
      return;
    }

    // Case 2: Same track, should play now (was paused) -> resume via SDK
    if (curr.trackUri && curr.shouldPlay && !trackChanged && playingChanged) {
      console.log("Resuming playback via SDK");
      player.resume();
      return;
    }

    // Case 3: Should pause -> pause via SDK
    if (!curr.shouldPlay && prev.shouldPlay) {
      console.log("Pausing playback via SDK");
      player.pause();
    }
  }, [isReady, deviceId, trackUri, shouldPlay, playTrackMutation]);

  // Manual toggle for play/pause button
  const togglePlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady) return;

    if (isPlaying) {
      console.log("Manual pause via toggle button");
      player.pause();
    } else {
      console.log("Manual resume via toggle button");
      player.resume();
    }
  }, [isReady, isPlaying]);

  return { isReady, isPlaying, isLoading, error, needsReauth, togglePlayback };
}
