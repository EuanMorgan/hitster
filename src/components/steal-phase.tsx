"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ActiveStealAttempt,
  CurrentTurnSong,
  TimelineSong,
} from "@/db/schema";

interface StealPhaseProps {
  currentSong: CurrentTurnSong;
  myTimeline: TimelineSong[];
  activePlayerName: string;
  activePlayerPlacement: number;
  stealAttempts: ActiveStealAttempt[];
  stealPhaseEndAt: string;
  stealWindowDuration: number;
  myTokens: number;
  isActivePlayer: boolean;
  hasAlreadyStolen: boolean;
  onSubmitSteal: (placementIndex: number) => void;
  onResolve: () => void;
  isSubmitting: boolean;
}

function StealDropZone({
  index,
  isActive,
  year,
  isOccupied,
  occupiedBy,
}: {
  index: number;
  isActive: boolean;
  year?: number;
  isOccupied?: boolean;
  occupiedBy?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `steal-drop-${index}`,
    disabled: isOccupied,
  });

  if (isOccupied) {
    return (
      <div className="flex flex-col items-center justify-center min-w-[48px] sm:min-w-[60px] min-h-[80px] sm:h-[100px] border-2 border-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg">
        <span className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-medium text-center px-1">
          🔒 {occupiedBy}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[60px] min-h-[80px] sm:h-[100px] border-2 border-dashed rounded-lg transition-all ${
        isOver
          ? "border-amber-500 bg-amber-500/20 scale-105"
          : isActive
            ? "border-amber-500/50 bg-amber-500/10"
            : "border-muted-foreground/30"
      }`}
    >
      <span className="text-xs text-muted-foreground">
        {year ? `≤${year}` : "Steal"}
      </span>
    </div>
  );
}

function StealSongCard({ isPlaced }: { isPlaced: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: "steal-song",
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  if (isPlaced) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg p-4 min-w-[100px] min-h-[80px] cursor-grab active:cursor-grabbing shadow-lg transition-all touch-none ${
        isDragging ? "opacity-50 scale-105" : ""
      }`}
    >
      <div className="text-center">
        <div className="text-2xl mb-1">🎯</div>
        <div className="text-sm font-medium">Steal!</div>
        <div className="text-xs opacity-75">Costs 1 🪙</div>
      </div>
    </div>
  );
}

function PlacedStealCard() {
  return (
    <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg p-3 shadow-lg min-w-[70px] sm:min-w-[80px] min-h-[60px] animate-pulse">
      <div className="text-center">
        <div className="text-xl mb-1">🎯</div>
        <div className="text-xs font-medium">Stealing!</div>
      </div>
    </div>
  );
}

function TimelineSongCard({ song }: { song: TimelineSong }) {
  return (
    <div className="bg-card border border-border rounded-lg p-2 sm:p-3 min-w-[70px] sm:min-w-[80px] min-h-[60px] shadow-sm">
      <div className="text-center">
        <div className="font-bold text-base sm:text-lg text-primary">
          {song.year}
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[65px] sm:max-w-[80px]">
          {song.name}
        </div>
      </div>
    </div>
  );
}

function StealTimer({
  stealPhaseEndAt,
  stealWindowDuration,
  onTimeUp,
}: {
  stealPhaseEndAt: string;
  stealWindowDuration: number;
  onTimeUp: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(stealWindowDuration);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const endTime = new Date(stealPhaseEndAt).getTime();

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
  }, [stealPhaseEndAt, onTimeUp, hasTriggered]);

  const percentage = (timeLeft / stealWindowDuration) * 100;
  // Color based on percentage: green >50%, amber 25-50%, red <25%
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
  // Pulse at 1Hz during last 5 seconds
  const shouldPulse = timeLeft <= 5 && timeLeft > 0;

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
        🎯 STEAL PHASE
      </div>
      <div
        className={`text-2xl sm:text-3xl font-mono font-bold ${colorClass} ${
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

export function StealPhase({
  currentSong,
  myTimeline,
  activePlayerName,
  activePlayerPlacement,
  stealAttempts,
  stealPhaseEndAt,
  stealWindowDuration,
  myTokens,
  isActivePlayer,
  hasAlreadyStolen,
  onSubmitSteal,
  onResolve,
  isSubmitting,
}: StealPhaseProps) {
  const [placementIndex, setPlacementIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sortedTimeline = [...myTimeline].sort((a, b) => a.year - b.year);

  const canSteal = !isActivePlayer && !hasAlreadyStolen && myTokens >= 1;

  const handleTimeUp = useCallback(() => {
    onResolve();
  }, [onResolve]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { over } = event;
      if (over?.id.toString().startsWith("steal-drop-")) {
        const index = Number.parseInt(
          over.id.toString().replace("steal-drop-", ""),
          10,
        );
        // Check if position is already taken
        if (!stealAttempts.some((a) => a.placementIndex === index)) {
          setPlacementIndex(index);
          // Vibrate on successful drop if device supports it
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      }
    },
    [stealAttempts],
  );

  const handleConfirmSteal = useCallback(() => {
    if (placementIndex !== null) {
      onSubmitSteal(placementIndex);
    }
  }, [placementIndex, onSubmitSteal]);

  const handleReset = useCallback(() => {
    setPlacementIndex(null);
  }, []);

  // Build occupied positions map
  const occupiedPositions = new Map<number, string>();
  for (const attempt of stealAttempts) {
    occupiedPositions.set(attempt.placementIndex, attempt.playerName);
  }

  return (
    <Card className="border-2 border-amber-500">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-amber-600 dark:text-amber-400">
          Steal Phase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StealTimer
          stealPhaseEndAt={stealPhaseEndAt}
          stealWindowDuration={stealWindowDuration}
          onTimeUp={handleTimeUp}
        />

        <div className="text-center text-sm text-muted-foreground">
          {activePlayerName} placed the song.{" "}
          {isActivePlayer
            ? "Waiting to see if anyone steals..."
            : canSteal
              ? "Spend 1 token to steal if you think they're wrong!"
              : hasAlreadyStolen
                ? "You've already submitted a steal attempt!"
                : "Not enough tokens to steal."}
        </div>

        {stealAttempts.length > 0 && (
          <div className="text-center text-sm">
            <span className="font-medium">Steal attempts: </span>
            {stealAttempts.map((a) => a.playerName).join(", ")}
          </div>
        )}

        {!isActivePlayer && canSteal && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <StealSongCard isPlaced={placementIndex !== null} />
              </div>

              <div className="text-center text-xs text-muted-foreground">
                Your timeline - place where you think the song belongs
              </div>

              <div className="overflow-x-auto pb-4">
                <div className="flex items-center gap-2 min-w-min px-4">
                  <StealDropZone
                    index={0}
                    isActive={activeId !== null}
                    year={sortedTimeline[0]?.year}
                    isOccupied={occupiedPositions.has(0)}
                    occupiedBy={occupiedPositions.get(0)}
                  />
                  {placementIndex === 0 && <PlacedStealCard />}

                  {sortedTimeline.map((song, idx) => (
                    <div key={song.songId} className="flex items-center gap-2">
                      <TimelineSongCard song={song} />
                      <StealDropZone
                        index={idx + 1}
                        isActive={activeId !== null}
                        year={sortedTimeline[idx + 1]?.year}
                        isOccupied={occupiedPositions.has(idx + 1)}
                        occupiedBy={occupiedPositions.get(idx + 1)}
                      />
                      {placementIndex === idx + 1 && <PlacedStealCard />}
                    </div>
                  ))}
                </div>
              </div>

              {placementIndex !== null && (
                <div className="flex justify-center gap-3 sm:gap-4 px-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSubmitting}
                    className="min-h-[44px] min-w-[80px]"
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleConfirmSteal}
                    disabled={isSubmitting}
                    className="bg-amber-500 hover:bg-amber-600 min-h-[44px] min-w-[100px] sm:min-w-[140px]"
                  >
                    {isSubmitting ? "Stealing..." : "Confirm (1 🪙)"}
                  </Button>
                </div>
              )}
            </div>

            <DragOverlay>
              {activeId === "steal-song" && (
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg p-4 shadow-xl scale-105">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="text-sm font-medium">Steal!</div>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {isActivePlayer && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">⏳</div>
            <div className="text-sm text-muted-foreground">
              Waiting for steal phase to end...
            </div>
          </div>
        )}

        {!isActivePlayer && hasAlreadyStolen && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">✓</div>
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              Steal attempt submitted!
            </div>
          </div>
        )}

        {!isActivePlayer && !canSteal && !hasAlreadyStolen && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🪙</div>
            <div className="text-sm text-muted-foreground">
              You need at least 1 token to steal
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
