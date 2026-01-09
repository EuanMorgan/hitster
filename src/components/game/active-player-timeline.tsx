"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SafeCurrentTurnSong, TimelineSong } from "@/db/schema";

function TokenDisplay({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground text-sm">No tokens</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-yellow-500">🪙</span>
      <span className="text-sm font-medium">
        <span className="hidden sm:inline">x</span>
        {count}
      </span>
    </div>
  );
}

export interface ActivePlayerTimelineProps {
  player: {
    id: string;
    name: string;
    avatar: string;
    tokens: number;
    timeline: TimelineSong[] | null;
  };
  currentSong: SafeCurrentTurnSong | null;
  turnStartedAt: string | null;
  turnDuration: number;
}

export function ActivePlayerTimeline({
  player,
  currentSong,
  turnStartedAt,
  turnDuration,
}: ActivePlayerTimelineProps) {
  const sortedTimeline = [...(player.timeline ?? [])].sort(
    (a, b) => a.year - b.year,
  );

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!turnStartedAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(turnStartedAt).getTime()) / 1000,
      );
      const remaining = Math.max(0, turnDuration - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [turnStartedAt, turnDuration]);

  const timerPercentage =
    timeRemaining !== null ? (timeRemaining / turnDuration) * 100 : 100;
  const timerColorClass =
    timerPercentage <= 25
      ? "text-red-500"
      : timerPercentage <= 50
        ? "text-amber-500"
        : "text-green-500";
  const barColorClass =
    timerPercentage <= 25
      ? "bg-red-500"
      : timerPercentage <= 50
        ? "bg-amber-500"
        : "bg-green-500";
  const shouldPulse =
    timeRemaining !== null && timeRemaining <= 5 && timeRemaining > 0;

  return (
    <Card className="border-2 border-primary bg-primary/5 relative">
      {timeRemaining !== null && (
        <div className="absolute top-4 right-4 flex flex-col items-center">
          <div
            className={`text-5xl md:text-6xl font-mono tabular-nums font-bold ${timerColorClass} ${
              shouldPulse ? "animate-[pulse_1s_ease-in-out_infinite]" : ""
            }`}
            style={{ minWidth: "80px", textAlign: "center" }}
          >
            {timeRemaining}s
          </div>
          <div className="w-20 h-2 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${barColorClass}`}
              style={{ width: `${timerPercentage}%` }}
            />
          </div>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4 pr-28">
          <span className="text-6xl">{player.avatar}</span>
          <div>
            <CardTitle className="text-3xl md:text-4xl">
              {player.name}&apos;s Turn
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-base">
              <span>
                <TokenDisplay count={player.tokens} />
              </span>
              <span>{player.timeline?.length ?? 0} songs in timeline</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentSong && (
          <div className="mb-6 p-6 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-center border-2 border-dashed border-amber-400">
            <div className="text-lg text-muted-foreground mb-2">
              Mystery Song Playing
            </div>
            <div className="text-5xl">🎵❓🎵</div>
            <div className="text-sm text-muted-foreground mt-2">
              Waiting for placement...
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-lg font-medium text-muted-foreground">
            Timeline ({sortedTimeline.length} songs)
          </h4>
          {sortedTimeline.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center border-2 border-dashed rounded-xl">
              <span className="text-3xl">🎵</span>
              <span className="text-lg">
                No songs yet — your musical journey starts here!
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {sortedTimeline.map((song) => (
                <div
                  key={song.songId}
                  className="bg-card border-2 border-primary/30 rounded-xl px-5 py-4 text-center min-w-[140px] shadow-md"
                >
                  <div className="font-bold text-3xl md:text-4xl text-primary">
                    {song.year}
                  </div>
                  <div className="text-base font-medium truncate max-w-[160px]">
                    {song.name}
                  </div>
                  <div className="text-sm text-muted-foreground truncate max-w-[160px]">
                    {song.artist}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
