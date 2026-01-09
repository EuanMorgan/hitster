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
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActiveStealAttempt, TimelineSong } from "@/db/schema";
import { useCountdownTimer } from "@/hooks/use-countdown-timer";

interface StealPhaseProps {
  activePlayerTimeline: TimelineSong[];
  activePlayerPlacement: number | null;
  activePlayerName: string;
  stealAttempts: ActiveStealAttempt[];
  stealPhaseEndAt: string;
  stealWindowDuration: number;
  isActivePlayer: boolean;
  hasAlreadyStolen: boolean;
  onSubmitSteal: (placementIndex: number) => void;
  onResolve: () => void;
  isSubmitting: boolean;
  decidedStealers?: string[];
  canStealAsLateJoiner?: boolean;
  currentPlayerId?: string;
}

function StealDropZone({
  index,
  isActive,
  year,
  isOccupied,
  occupiedBy,
  isLast,
  prevYear,
}: {
  index: number;
  isActive: boolean;
  year?: number;
  isOccupied?: boolean;
  occupiedBy?: string;
  isLast?: boolean;
  prevYear?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `steal-drop-${index}`,
    disabled: isOccupied,
  });

  const label = year
    ? `≤${year}`
    : isLast && prevYear
      ? `>${prevYear}`
      : "Steal";

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
      <span className="text-xs text-muted-foreground">{label}</span>
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
      className={`bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-lg p-4 min-w-[100px] min-h-[80px] cursor-grab active:cursor-grabbing shadow-lg transition-all duration-150 touch-none ${
        isDragging ? "opacity-50" : ""
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
    <div className="bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-lg p-3 shadow-lg min-w-[70px] sm:min-w-[80px] min-h-[60px] animate-pulse">
      <div className="text-center">
        <div className="text-xl mb-1">🎯</div>
        <div className="text-xs font-medium">Stealing!</div>
      </div>
    </div>
  );
}

function TimelineSongCard({ song }: { song: TimelineSong }) {
  return (
    <div className="bg-linear-to-br from-card to-muted/50 border-2 border-green-500/30 rounded-lg p-2 sm:p-3 min-w-[80px] sm:min-w-[100px] min-h-[70px] shadow-sm">
      <div className="text-center">
        <div className="font-bold text-lg sm:text-xl text-primary">
          {song.year}
        </div>
        <div className="text-xs text-foreground line-clamp-1 max-w-[75px] sm:max-w-[95px]">
          {song.name}
        </div>
        <div className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[75px] sm:max-w-[95px]">
          {song.artist}
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
  const { timeLeft, percentage, colorClass, barColorClass, shouldPulse } =
    useCountdownTimer({
      endTime: stealPhaseEndAt,
      duration: stealWindowDuration,
      onTimeUp,
    });

  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">
        🎯 STEAL PHASE
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

function ActivePlacementMarker() {
  return (
    <div className="bg-amber-500/30 border-2 border-amber-500 border-dashed rounded-lg p-2 min-w-[70px] sm:min-w-[80px] min-h-[60px] sm:min-h-[70px]">
      <div className="text-center">
        <div className="text-lg sm:text-xl">🎵</div>
        <div className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium">
          Their guess
        </div>
      </div>
    </div>
  );
}

export function StealPhase({
  activePlayerTimeline,
  activePlayerPlacement,
  activePlayerName,
  stealAttempts,
  stealPhaseEndAt,
  stealWindowDuration,
  isActivePlayer,
  hasAlreadyStolen,
  onSubmitSteal,
  onResolve,
  isSubmitting,
  decidedStealers = [],
  canStealAsLateJoiner = false,
  currentPlayerId,
}: StealPhaseProps) {
  const [placementIndex, setPlacementIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sortedTimeline = [...activePlayerTimeline].sort(
    (a, b) => a.year - b.year,
  );

  // In place phase, can steal if: already committed in decide phase OR late-joiner with tokens
  const committedInDecidePhase =
    currentPlayerId && decidedStealers.includes(currentPlayerId);
  const canSteal =
    !isActivePlayer &&
    !hasAlreadyStolen &&
    (committedInDecidePhase || canStealAsLateJoiner);

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
          {isActivePlayer
            ? "Waiting to see if anyone steals..."
            : canSteal
              ? `Place where you think the song belongs in ${activePlayerName}'s timeline!`
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
                {activePlayerName}&apos;s timeline - place where you think the
                song belongs
              </div>

              <div className="overflow-x-auto pb-4">
                <div className="flex items-center gap-2 min-w-min px-4">
                  {activePlayerPlacement === 0 && <ActivePlacementMarker />}
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
                      {activePlayerPlacement === idx + 1 && (
                        <ActivePlacementMarker />
                      )}
                      <StealDropZone
                        index={idx + 1}
                        isActive={activeId !== null}
                        year={sortedTimeline[idx + 1]?.year}
                        isOccupied={occupiedPositions.has(idx + 1)}
                        occupiedBy={occupiedPositions.get(idx + 1)}
                        isLast={idx === sortedTimeline.length - 1}
                        prevYear={song.year}
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
                <div className="bg-linear-to-br from-amber-500 to-amber-600 text-white rounded-lg p-4 shadow-xl scale-105">
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
