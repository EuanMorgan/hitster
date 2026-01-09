"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";

type GameSettings = {
  songsToWin: number;
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
  turnDuration: { label: "Turn Duration", min: 30, max: 90, unit: "sec" },
  stealWindowDuration: { label: "Steal Window", min: 5, max: 20, unit: "sec" },
  maxPlayers: { label: "Max Players", min: 1, max: 20, unit: "players" },
} as const;

type NumericSettingsKey = keyof typeof SETTINGS_CONFIG;

export function GameSettings({ pin, initialSettings }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(initialSettings);
  const [inputValues, setInputValues] = useState<
    Record<NumericSettingsKey, string>
  >({
    songsToWin: String(initialSettings.songsToWin),
    turnDuration: String(initialSettings.turnDuration),
    stealWindowDuration: String(initialSettings.stealWindowDuration),
    maxPlayers: String(initialSettings.maxPlayers),
  });
  const [error, setError] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    trpc.game.updateSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.game.getSession.queryKey({ pin }),
        });
        setError(null);
        toast.success("Settings saved");
        setIsOpen(false);
      },
      onError: (err) => {
        setError(err.message);
        toast.error("Failed to save settings");
      },
    }),
  );

  const handleChange = (key: NumericSettingsKey, value: string) => {
    setInputValues((prev) => ({ ...prev, [key]: value }));

    const numValue = parseInt(value, 10);
    if (!Number.isNaN(numValue)) {
      setSettings((prev) => ({ ...prev, [key]: numValue }));
    }
  };

  const handleBlur = (key: NumericSettingsKey) => {
    const config = SETTINGS_CONFIG[key];
    const numValue = parseInt(inputValues[key], 10);

    if (Number.isNaN(numValue) || numValue < config.min) {
      setSettings((prev) => ({ ...prev, [key]: config.min }));
      setInputValues((prev) => ({ ...prev, [key]: String(config.min) }));
    } else if (numValue > config.max) {
      setSettings((prev) => ({ ...prev, [key]: config.max }));
      setInputValues((prev) => ({ ...prev, [key]: String(config.max) }));
    }
  };

  const handlePlaylistChange = (value: string) => {
    setSettings((prev) => ({ ...prev, playlistUrl: value || null }));
  };

  const handleSave = () => {
    // Clamp all values before saving
    const clampedSettings = { ...settings };
    for (const key of Object.keys(SETTINGS_CONFIG) as NumericSettingsKey[]) {
      const config = SETTINGS_CONFIG[key];
      clampedSettings[key] = Math.min(
        Math.max(settings[key], config.min),
        config.max,
      );
    }

    updateMutation.mutate({
      pin,
      ...clampedSettings,
    });
  };

  const hasChanges =
    settings.songsToWin !== initialSettings.songsToWin ||
    settings.turnDuration !== initialSettings.turnDuration ||
    settings.stealWindowDuration !== initialSettings.stealWindowDuration ||
    settings.maxPlayers !== initialSettings.maxPlayers ||
    settings.playlistUrl !== initialSettings.playlistUrl;

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setIsOpen(true)}
      >
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
        {(Object.keys(SETTINGS_CONFIG) as (keyof typeof SETTINGS_CONFIG)[]).map(
          (key) => {
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
                    value={inputValues[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    onBlur={() => handleBlur(key)}
                    className="h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground w-12">
                    {config.unit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {config.min}-{config.max}
                </p>
              </div>
            );
          },
        )}
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
