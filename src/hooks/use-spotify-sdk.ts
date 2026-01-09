"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

// Module-level state to prevent duplicate SDK instances
let sdkInitialized = false;
let sdkScript: HTMLScriptElement | null = null;

interface UseSpotifySDKOptions {
  onPlaybackStarted?: () => void;
  onPlaybackStopped?: () => void;
  onPlaybackError?: (error: string) => void;
}

interface UseSpotifySDKResult {
  player: Spotify.Player | null;
  deviceId: string | null;
  isReady: boolean;
  error: string | null;
  needsReauth: boolean;
}

export function useSpotifySDK(
  isHost: boolean,
  options: UseSpotifySDKOptions = {},
): UseSpotifySDKResult {
  const trpc = useTRPC();
  const playerRef = useRef<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  // Store callbacks in refs to prevent re-initialization on prop changes
  const onPlaybackStartedRef = useRef(options.onPlaybackStarted);
  const onPlaybackStoppedRef = useRef(options.onPlaybackStopped);
  const onPlaybackErrorRef = useRef(options.onPlaybackError);

  // Update refs when callbacks change
  useEffect(() => {
    onPlaybackStartedRef.current = options.onPlaybackStarted;
  }, [options.onPlaybackStarted]);

  useEffect(() => {
    onPlaybackStoppedRef.current = options.onPlaybackStopped;
  }, [options.onPlaybackStopped]);

  useEffect(() => {
    onPlaybackErrorRef.current = options.onPlaybackError;
  }, [options.onPlaybackError]);

  // Get access token from server
  const {
    data: tokenData,
    error: tokenError,
    refetch: refetchToken,
  } = useQuery(trpc.spotify.getAccessToken.queryOptions());

  const hasToken = !!tokenData?.accessToken;

  // Transfer playback mutation
  const transferMutation = useMutation(
    trpc.spotify.transferPlayback.mutationOptions(),
  );

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

  // Handle non-reauth token errors
  useEffect(() => {
    if (tokenError && !isReauthRequired(tokenError)) {
      setError("Failed to get Spotify access token. Please re-authenticate.");
      onPlaybackErrorRef.current?.("Token error");
    }
  }, [tokenError]);

  // Initialize the Spotify Web Playback SDK
  useEffect(() => {
    if (!isHost || !hasToken) return;

    // Guard against duplicate initialization
    if (sdkInitialized && playerRef.current) {
      return;
    }

    const initPlayer = () => {
      if (playerRef.current) {
        return;
      }

      const player = new window.Spotify.Player({
        name: "Hitster Game",
        getOAuthToken: async (cb) => {
          const result = await refetchToken();
          if (result.data?.accessToken) {
            cb(result.data.accessToken);
          } else if (result.error && isReauthRequired(result.error)) {
            handleReauth();
          }
        },
        volume: 0.5,
      });

      // Error handling
      player.addListener("initialization_error", ({ message }) => {
        console.error("Spotify initialization error:", message);
        setError(`Initialization error: ${message}`);
        toast.error("Playback failed - check Spotify Premium status");
        onPlaybackErrorRef.current?.(message);
      });

      player.addListener("authentication_error", ({ message }) => {
        console.error("Spotify authentication error:", message);
        setError(`Authentication error: ${message}`);
        toast.error("Spotify authentication failed - reconnecting...");
        onPlaybackErrorRef.current?.(message);
        handleReauth();
      });

      player.addListener("account_error", ({ message }) => {
        console.error("Spotify account error:", message);
        setError(`Account error: ${message}. You need Spotify Premium.`);
        toast.error("Playback failed - check Spotify Premium status");
        onPlaybackErrorRef.current?.(message);
      });

      player.addListener("playback_error", ({ message }) => {
        console.error("Spotify playback error:", message);
        setError(`Playback error: ${message}`);
        toast.error("Playback failed - check Spotify Premium status");
        onPlaybackErrorRef.current?.(message);
      });

      // Ready
      player.addListener("ready", ({ device_id }) => {
        console.log("Spotify player ready with device ID:", device_id);
        setDeviceId(device_id);
        setIsReady(true);
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
        if (!state.paused) {
          onPlaybackStartedRef.current?.();
        } else {
          onPlaybackStoppedRef.current?.();
        }
      });

      player.connect();
      playerRef.current = player;
      sdkInitialized = true;
    };

    // Load SDK script only once
    if (!sdkScript) {
      sdkScript = document.createElement("script");
      sdkScript.src = "https://sdk.scdn.co/spotify-player.js";
      sdkScript.async = true;
      document.body.appendChild(sdkScript);

      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    } else if (window.Spotify) {
      // SDK already loaded, init player directly
      initPlayer();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        sdkInitialized = false;
      }
    };
  }, [isHost, hasToken, refetchToken, handleReauth, transferMutation.mutate]);

  return {
    player: playerRef.current,
    deviceId,
    isReady,
    error,
    needsReauth,
  };
}

function isReauthRequired(error: unknown): boolean {
  if (error && typeof error === "object" && "message" in error) {
    return (error as { message: string }).message === "SPOTIFY_REAUTH_REQUIRED";
  }
  return false;
}
