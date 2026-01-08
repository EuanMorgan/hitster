"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type GameSettings = {
  songsToWin: number;
  songPlayDuration: number;
  turnDuration: number;
  stealWindowDuration: number;
  maxPlayers: number;
  playlistUrl: string | null;
};

type Props = {
  pin: string;
  initialSettings: GameSettings;
};

const SETTINGS_CONFIG = {
  songsToWin: { label: "Songs to Win", min: 5, max: 20, unit: "songs" },
  songPlayDuration: { label: "Song Play Duration", min: 15, max: 60, unit: "sec" },
  turnDuration: { label: "Turn Duration", min: 30, max: 90, unit: "sec" },
  stealWindowDuration: { label: "Steal Window", min: 5, max: 20, unit: "sec" },
  maxPlayers: { label: "Max Players", min: 1, max: 20, unit: "players" },
} as const;

export function GameSettings({ pin, initialSettings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [error, setError] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    trpc.game.updateSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.game.getSession.queryKey({ pin }) });
        setError(null);
      },
      onError: (err) => {
        setError(err.message);
      },
    })
  );

  const handleChange = (key: keyof typeof SETTINGS_CONFIG, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    const config = SETTINGS_CONFIG[key];
    const clampedValue = Math.min(Math.max(numValue, config.min), config.max);

    setSettings((prev) => ({ ...prev, [key]: clampedValue }));
  };

  const handlePlaylistChange = (value: string) => {
    setSettings((prev) => ({ ...prev, playlistUrl: value || null }));
  };

  const handleSave = () => {
    updateMutation.mutate({
      pin,
      ...settings,
    });
  };

  const hasChanges =
    settings.songsToWin !== initialSettings.songsToWin ||
    settings.songPlayDuration !== initialSettings.songPlayDuration ||
    settings.turnDuration !== initialSettings.turnDuration ||
    settings.stealWindowDuration !== initialSettings.stealWindowDuration ||
    settings.maxPlayers !== initialSettings.maxPlayers ||
    settings.playlistUrl !== initialSettings.playlistUrl;

  if (!isOpen) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setIsOpen(true)}>
        ⚙️ Game Settings
      </Button>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-muted rounded-lg">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Game Settings</h4>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          ✕
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(SETTINGS_CONFIG) as (keyof typeof SETTINGS_CONFIG)[]).map((key) => {
          const config = SETTINGS_CONFIG[key];
          return (
            <div key={key} className="space-y-1">
              <Label htmlFor={key} className="text-xs">
                {config.label}
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  id={key}
                  type="number"
                  min={config.min}
                  max={config.max}
                  value={settings[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground w-12">{config.unit}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {config.min}-{config.max}
              </p>
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <Label htmlFor="playlistUrl" className="text-xs">
          Custom Spotify Playlist URL (optional)
        </Label>
        <Input
          id="playlistUrl"
          type="url"
          placeholder="https://open.spotify.com/playlist/..."
          value={settings.playlistUrl || ""}
          onChange={(e) => handlePlaylistChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={handleSave}
        disabled={!hasChanges || updateMutation.isPending}
        className="w-full"
      >
        {updateMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
