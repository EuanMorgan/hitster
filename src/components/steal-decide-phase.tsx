"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StealDecidePhaseProps {
  activePlayerName: string;
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
  const [timeLeft, setTimeLeft] = useState(stealWindowDuration);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const endTime = new Date(stealDecidePhaseEndAt).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && !hasTriggered) {
        setHasTriggered(true);
        onTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [stealDecidePhaseEndAt, onTimeUp, hasTriggered]);

  const percentage = (timeLeft / stealWindowDuration) * 100;
  const colorClass =
    percentage <= 25
      ? "text-red-500"
      : percentage <= 50
        ? "text-amber-500"
        : "text-green-500";
  const barColorClass =
    percentage <= 25
      ? "bg-red-500"
      : percentage <= 50
        ? "bg-amber-500"
        : "bg-green-500";
  const shouldPulse = timeLeft <= 5 && timeLeft > 0;

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

export function StealDecidePhase({
  activePlayerName,
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

        <div className="text-center text-sm text-muted-foreground">
          {activePlayerName} placed the song.{" "}
          {isActivePlayer
            ? "Waiting for others to decide..."
            : hasDecided
              ? "You've made your decision!"
              : canSteal
                ? "Do you want to try to steal?"
                : "Not enough tokens to steal."}
        </div>

        {/* Progress indicator */}
        <div className="text-center text-xs text-muted-foreground">
          {decidedCount}/{totalEligible} players decided
        </div>

        {/* Action buttons for non-active players who haven't decided */}
        {!isActivePlayer && !hasDecided && (
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
