"use client";

import { useEffect, useRef } from "react";
import { useSpotifyPlayback } from "@/hooks/use-spotify-playback";
import { useSpotifySDK } from "@/hooks/use-spotify-sdk";

interface SpotifyPlayerProps {
  isHost: boolean;
  trackUri?: string | null;
  shouldPlay: boolean;
  onPlaybackStarted?: () => void;
  onPlaybackStopped?: () => void;
  onPlaybackError?: (error: string) => void;
  onDeviceReady?: (deviceId: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

export function SpotifyPlayer({
  isHost,
  trackUri,
  shouldPlay,
  onPlaybackStarted,
  onPlaybackStopped,
  onPlaybackError,
  onDeviceReady,
  onLoadingChange,
}: SpotifyPlayerProps) {
  // Initialize SDK
  const sdk = useSpotifySDK(isHost, {
    onPlaybackStarted,
    onPlaybackStopped,
    onPlaybackError,
  });

  // Playback controls
  const playback = useSpotifyPlayback({
    deviceId: sdk.deviceId,
    onPlaybackError,
  });

  // Track last URI to detect changes
  const lastUriRef = useRef<string | null>(null);

  // Notify parent when device is ready
  useEffect(() => {
    if (sdk.deviceId) {
      onDeviceReady?.(sdk.deviceId);
    }
  }, [sdk.deviceId, onDeviceReady]);

  // Emit loading state changes to parent
  useEffect(() => {
    onLoadingChange?.(playback.isLoading);
  }, [playback.isLoading, onLoadingChange]);

  // Handle play/pause based on shouldPlay prop
  useEffect(() => {
    if (!sdk.isReady || !sdk.deviceId || !trackUri) return;

    const trackChanged = trackUri !== lastUriRef.current;

    if (shouldPlay && trackChanged) {
      lastUriRef.current = trackUri;
      playback.play(trackUri, 0);
    } else if (!shouldPlay && playback.isPlaying) {
      playback.pause();
    } else if (!shouldPlay && lastUriRef.current) {
      lastUriRef.current = null;
    }
  }, [shouldPlay, sdk.isReady, sdk.deviceId, trackUri, playback]);

  if (!isHost) {
    return null;
  }

  const error = sdk.error || playback.error;
  const isLoading = playback.isLoading;

  return (
    <div className="bg-zinc-900 rounded-lg p-4 text-white">
      {sdk.needsReauth ? (
        <div className="flex items-center gap-2 text-amber-400">
          <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full" />
          <span>Redirecting to Spotify login...</span>
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm">
          {error}
          <p className="text-xs text-zinc-400 mt-1">
            Playback requires Spotify Premium
          </p>
        </div>
      ) : !sdk.isReady ? (
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
            {playback.isPlaying ? "Now Playing" : "Paused"}
          </span>
          <span className="text-zinc-500">-</span>
          <span className="text-zinc-400">Mystery Song</span>
        </div>
      )}
    </div>
  );
}
