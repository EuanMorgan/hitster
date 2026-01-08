"use client";

import { cn } from "@/lib/utils";

const avatarPresets = [
  "👑",
  "🎸",
  "🎤",
  "🎹",
  "🥁",
  "🎺",
  "🎻",
  "🎷",
  "🎵",
  "🎶",
  "🎧",
  "🎼",
  "🎙️",
  "🎚️",
  "🎛️",
  "📀",
  "💿",
  "🎭",
  "🌟",
  "✨",
];

interface AvatarSelectorProps {
  value: string;
  onChange: (avatar: string) => void;
}

export function AvatarSelector({ value, onChange }: AvatarSelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {avatarPresets.map((avatar) => (
        <button
          key={avatar}
          type="button"
          onClick={() => onChange(avatar)}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition-all hover:scale-110",
            value === avatar
              ? "bg-primary ring-2 ring-primary ring-offset-2"
              : "bg-muted hover:bg-muted/80",
          )}
        >
          {avatar}
        </button>
      ))}
    </div>
  );
}

export { avatarPresets };
