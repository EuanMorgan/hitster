"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineSong } from "@/db/schema";
import { useCountdownTimer } from "@/hooks/use-countdown-timer";

interface StealDecidePhaseProps {
  activePlayerName: string;
  activePlayerTimeline: TimelineSong[];
  activePlayerPlacement: number | null;
  stealDecidePhaseEndAt: string;
  stealWindowDuration: number;
  myTokens: number;
  isActivePlayer: boolean;
  hasDecided: boolean;
  decidedCount: number;
  totalEligible: number;
  onDecideSteal: () => void;
  onSkipSteal: () => void;
  onTimeUp: () => void;
  isDeciding: boolean;
  isSkipping: boolean;
}

function DecideTimer({
  stealDecidePhaseEndAt,
  stealWindowDuration,
  onTimeUp,
}: {
  stealDecidePhaseEndAt: string;
  stealWindowDuration: number;
  onTimeUp: () => void;
}) {
  const { timeLeft, percentage, colorClass, barColorClass, shouldPulse } =
    useCountdownTimer({
      endTime: stealDecidePhaseEndAt,
      duration: stealWindowDuration,
      onTimeUp,
    });

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
        DECIDE PHASE
      </div>
      <div
        className={`text-2xl sm:text-3xl font-mono tabular-nums font-bold ${colorClass} ${
          shouldPulse ? "animate-[pulse_1s_ease-in-out_infinite]" : ""
        }`}
      >
        {timeLeft}s
      </div>
      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TimelineSlot({
  song,
  isPlacement,
}: {
  song?: TimelineSong;
  isPlacement?: boolean;
}) {
  if (isPlacement) {
    return (
      <div className="bg-amber-500/20 border-2 border-amber-500 rounded-lg p-2 min-w-[70px] sm:min-w-[80px] min-h-[60px] sm:min-h-[70px] animate-pulse">
        <div className="text-center">
          <div className="text-lg sm:text-xl">🎵</div>
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Placed here
          </div>
        </div>
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="bg-linear-to-br from-card to-muted/50 border-2 border-green-500/30 rounded-lg p-2 min-w-[70px] sm:min-w-[80px] min-h-[60px] sm:min-h-[70px] shadow-sm">
      <div className="text-center">
        <div className="font-bold text-base sm:text-lg text-primary">
          {song.year}
        </div>
        <div className="text-[10px] sm:text-xs text-foreground line-clamp-1 max-w-[65px] sm:max-w-[75px]">
          {song.displayName ?? song.name}
        </div>
        <div className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-[65px] sm:max-w-[75px]">
          {song.artist}
        </div>
      </div>
    </div>
  );
}

function ActivePlayerTimelineDisplay({
  timeline,
  placementIndex,
  playerName,
}: {
  timeline: TimelineSong[];
  placementIndex: number | null;
  playerName: string;
}) {
  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year);

  return (
    <div className="space-y-2">
      <div className="text-center text-xs text-muted-foreground">
        {playerName}&apos;s timeline - where they placed the song:
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-min px-2 justify-center">
          {placementIndex === 0 && <TimelineSlot isPlacement />}
          {sortedTimeline.map((song, idx) => (
            <div
              key={song.songId}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <TimelineSlot song={song} />
              {placementIndex === idx + 1 && <TimelineSlot isPlacement />}
            </div>
          ))}
          {sortedTimeline.length === 0 && placementIndex === 0 && (
            <div className="text-xs text-muted-foreground">First song</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StealDecidePhase({
  activePlayerName,
  activePlayerTimeline,
  activePlayerPlacement,
  stealDecidePhaseEndAt,
  stealWindowDuration,
  myTokens,
  isActivePlayer,
  hasDecided,
  decidedCount,
  totalEligible,
  onDecideSteal,
  onSkipSteal,
  onTimeUp,
  isDeciding,
  isSkipping,
}: StealDecidePhaseProps) {
  const canSteal = !isActivePlayer && !hasDecided && myTokens >= 1;

  const handleTimeUp = useCallback(() => {
    onTimeUp();
  }, [onTimeUp]);

  return (
    <Card className="border-2 border-amber-500">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-amber-600 dark:text-amber-400">
          Steal Decision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DecideTimer
          stealDecidePhaseEndAt={stealDecidePhaseEndAt}
          stealWindowDuration={stealWindowDuration}
          onTimeUp={handleTimeUp}
        />

        <ActivePlayerTimelineDisplay
          timeline={activePlayerTimeline}
          placementIndex={activePlayerPlacement}
          playerName={activePlayerName}
        />

        <div className="text-center text-sm text-muted-foreground">
          {isActivePlayer
            ? "Waiting for others to decide..."
            : hasDecided
              ? "You've made your decision!"
              : canSteal
                ? "Think they placed it wrong? Steal!"
                : "Not enough tokens to steal."}
        </div>

        {/* Progress indicator */}
        <div className="text-center text-xs text-muted-foreground">
          {decidedCount}/{totalEligible} players decided
        </div>

        {/* Action buttons for non-active players who haven't decided and CAN steal */}
        {!isActivePlayer && !hasDecided && canSteal && (
          <div className="flex justify-center gap-3 sm:gap-4 px-2">
            <Button
              variant="outline"
              onClick={onSkipSteal}
              disabled={isSkipping || isDeciding}
              className="min-h-[44px] min-w-[100px]"
            >
              {isSkipping ? "Skipping..." : "Skip"}
            </Button>
            <Button
              onClick={onDecideSteal}
              disabled={!canSteal || isDeciding || isSkipping}
              className="bg-amber-500 hover:bg-amber-600 min-h-[44px] min-w-[120px]"
            >
              {isDeciding ? "..." : "Steal (🪙1)"}
            </Button>
          </div>
        )}

        {/* Waiting state for active player */}
        {isActivePlayer && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">⏳</div>
            <div className="text-sm text-muted-foreground">
              Waiting for players to decide...
            </div>
          </div>
        )}

        {/* Confirmed state */}
        {!isActivePlayer && hasDecided && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✓</div>
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              Decision made! Waiting for others...
            </div>
          </div>
        )}

        {/* No tokens state */}
        {!isActivePlayer && !hasDecided && !canSteal && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🪙</div>
            <div className="text-sm text-muted-foreground">
              You need at least 1 token to steal
            </div>
            <Button
              variant="outline"
              onClick={onSkipSteal}
              disabled={isSkipping}
              className="mt-3 min-h-[44px]"
            >
              {isSkipping ? "Skipping..." : "Skip"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
