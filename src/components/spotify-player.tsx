"use client";

import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpotifyPlayer } from "@/hooks/use-spotify-player";

interface SpotifyPlayerProps {
  isHost: boolean;
  trackUri: string | null;
  shouldPlay: boolean;
  onPlaybackStarted?: () => void;
  onPlaybackStopped?: () => void;
  onPlaybackError?: (error: string) => void;
}

export function SpotifyPlayer({
  isHost,
  trackUri,
  shouldPlay,
  onPlaybackStarted,
  onPlaybackStopped,
  onPlaybackError,
}: SpotifyPlayerProps) {
  const { isReady, isPlaying, isLoading, error, needsReauth, togglePlayback } =
    useSpotifyPlayer({
      enabled: isHost,
      trackUri,
      shouldPlay,
      onPlaybackStarted,
      onPlaybackStopped,
      onError: onPlaybackError,
    });

  if (!isHost) return null;

  return (
    <div className="bg-zinc-900 rounded-lg p-4 text-white">
      {needsReauth ? (
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">
              {isPlaying ? "Now Playing" : "Paused"}
            </span>
            <span className="text-zinc-500">-</span>
            <span className="text-zinc-400">Mystery Song</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayback}
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
