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
import { Input } from "@/components/ui/input";
import type { CurrentTurnSong, TimelineSong } from "@/db/schema";

interface TimelineDropZoneProps {
  timeline: TimelineSong[];
  currentSong: CurrentTurnSong;
  onConfirm: (
    placementIndex: number,
    guessedName?: string,
    guessedArtist?: string,
  ) => void;
  onTimeUp: () => void;
  onSkip?: () => void;
  onGetFreeSong?: () => void;
  isSubmitting: boolean;
  isSkipping?: boolean;
  isGettingFreeSong?: boolean;
  turnDuration: number;
  turnStartedAt: string | null;
  tokens: number;
  timerPaused?: boolean;
}

function DropZone({
  index,
  isActive,
  year,
}: {
  index: number;
  isActive: boolean;
  year?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${index}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[60px] min-h-[80px] sm:h-[100px] border-2 border-dashed rounded-lg transition-all ${
        isOver
          ? "border-primary bg-primary/20 scale-105"
          : isActive
            ? "border-primary/50 bg-primary/10"
            : "border-muted-foreground/30"
      }`}
    >
      <span className="text-xs text-muted-foreground">
        {year ? `≤${year}` : "Drop"}
      </span>
    </div>
  );
}

function DraggableSongCard({
  song,
  isPlaced,
}: {
  song: CurrentTurnSong;
  isPlaced: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: "current-song",
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
      className={`bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg p-4 min-w-[100px] min-h-[80px] cursor-grab active:cursor-grabbing shadow-lg transition-all touch-none ${
        isDragging ? "opacity-50 scale-105" : ""
      }`}
    >
      <div className="text-center">
        <div className="text-2xl mb-1">🎵</div>
        <div className="text-sm font-medium">Mystery Song</div>
        <div className="text-xs opacity-75">Drag to timeline</div>
      </div>
    </div>
  );
}

function PlacedSongCard({ song }: { song: CurrentTurnSong }) {
  return (
    <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg p-3 shadow-lg min-w-[70px] sm:min-w-[80px] min-h-[60px] animate-pulse">
      <div className="text-center">
        <div className="text-xl mb-1">🎵</div>
        <div className="text-xs font-medium">Placed!</div>
        <div className="text-[10px] opacity-75">???</div>
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

function TurnTimer({
  turnDuration,
  turnStartedAt,
  onTimeUp,
  isPaused = false,
}: {
  turnDuration: number;
  turnStartedAt: string | null;
  onTimeUp: () => void;
  isPaused?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(turnDuration);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [pausedTimeLeft, setPausedTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!turnStartedAt) {
      setTimeLeft(turnDuration);
      setHasTriggered(false);
      setPausedTimeLeft(null);
      return;
    }

    // When pausing, store the current time left
    if (isPaused) {
      if (pausedTimeLeft === null) {
        const startTime = new Date(turnStartedAt).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, turnDuration - elapsed);
        setPausedTimeLeft(remaining);
        setTimeLeft(remaining);
      }
      return;
    }

    // If resuming from pause, we still show pausedTimeLeft (no actual timer resume logic needed here -
    // server controls the actual timer, we just freeze the UI)
    if (pausedTimeLeft !== null) {
      setPausedTimeLeft(null);
    }

    const startTime = new Date(turnStartedAt).getTime();

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, turnDuration - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0 && !hasTriggered) {
        setHasTriggered(true);
        onTimeUp();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [
    turnDuration,
    turnStartedAt,
    onTimeUp,
    hasTriggered,
    isPaused,
    pausedTimeLeft,
  ]);

  // Reset hasTriggered when turn changes
  useEffect(() => {
    setHasTriggered(false);
  }, []);

  const percentage = (timeLeft / turnDuration) * 100;
  // Color based on percentage: green >50%, amber 25-50%, red <25%
  // Use gray/muted when paused
  const colorClass = isPaused
    ? "text-muted-foreground"
    : percentage <= 25
      ? "text-red-500"
      : percentage <= 50
        ? "text-amber-500"
        : "text-green-500";
  const barColorClass = isPaused
    ? "bg-muted-foreground"
    : percentage <= 25
      ? "bg-red-500"
      : percentage <= 50
        ? "bg-amber-500"
        : "bg-green-500";
  // Pulse at 1Hz during last 5 seconds (but not when paused)
  const shouldPulse = !isPaused && timeLeft <= 5 && timeLeft > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-3xl sm:text-4xl font-mono font-bold ${colorClass} ${
          shouldPulse ? "animate-[pulse_1s_ease-in-out_infinite]" : ""
        }`}
      >
        {timeLeft}s
      </div>
      {isPaused && (
        <div className="text-xs sm:text-sm text-muted-foreground font-medium">
          ⏸️ Paused
        </div>
      )}
      {!isPaused && timeLeft <= 5 && timeLeft > 0 && (
        <div className="text-xs sm:text-sm text-red-500 font-medium animate-bounce">
          ⚠️ Time running out!
        </div>
      )}
      <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function TimelineDropZone({
  timeline,
  currentSong,
  onConfirm,
  onTimeUp,
  onSkip,
  onGetFreeSong,
  isSubmitting,
  isSkipping,
  isGettingFreeSong,
  turnDuration,
  turnStartedAt,
  tokens,
  timerPaused = false,
}: TimelineDropZoneProps) {
  const [placementIndex, setPlacementIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [guessedName, setGuessedName] = useState("");
  const [guessedArtist, setGuessedArtist] = useState("");

  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year);

  const handleTimeUp = useCallback(() => {
    if (isSubmitting) return;
    // Auto-submit with current placement or default to position 0
    const finalPlacement = placementIndex ?? 0;
    onConfirm(
      finalPlacement,
      guessedName || undefined,
      guessedArtist || undefined,
    );
    onTimeUp();
  }, [
    isSubmitting,
    placementIndex,
    onConfirm,
    onTimeUp,
    guessedName,
    guessedArtist,
  ]);

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { over } = event;
    if (over?.id.toString().startsWith("drop-")) {
      const index = Number.parseInt(
        over.id.toString().replace("drop-", ""),
        10,
      );
      setPlacementIndex(index);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (placementIndex !== null) {
      onConfirm(
        placementIndex,
        guessedName || undefined,
        guessedArtist || undefined,
      );
    }
  }, [placementIndex, onConfirm, guessedName, guessedArtist]);

  const handleReset = useCallback(() => {
    setPlacementIndex(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <TurnTimer
          turnDuration={turnDuration}
          turnStartedAt={turnStartedAt}
          onTimeUp={handleTimeUp}
          isPaused={timerPaused}
        />

        <div className="flex justify-center">
          <DraggableSongCard
            song={currentSong}
            isPlaced={placementIndex !== null}
          />
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex items-center gap-2 min-w-min px-4">
            <DropZone
              index={0}
              isActive={activeId !== null}
              year={sortedTimeline[0]?.year}
            />
            {placementIndex === 0 && <PlacedSongCard song={currentSong} />}

            {sortedTimeline.map((song, idx) => (
              <div key={song.songId} className="flex items-center gap-2">
                <TimelineSongCard song={song} />
                <DropZone
                  index={idx + 1}
                  isActive={activeId !== null}
                  year={sortedTimeline[idx + 1]?.year}
                />
                {placementIndex === idx + 1 && (
                  <PlacedSongCard song={currentSong} />
                )}
              </div>
            ))}
          </div>
        </div>

        {sortedTimeline.length === 0 && placementIndex === null && (
          <div className="text-center text-muted-foreground text-sm">
            Drag the song to the drop zone to place it in your timeline
          </div>
        )}

        {/* Token action buttons - visible before song is placed */}
        {placementIndex === null && (
          <div className="flex flex-col items-center gap-3 px-2">
            <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
              {/* Skip button - min 44px touch target */}
              {onSkip && (
                <Button
                  variant="outline"
                  onClick={onSkip}
                  disabled={
                    tokens < 1 ||
                    isSkipping ||
                    isSubmitting ||
                    isGettingFreeSong
                  }
                  className="gap-1.5 sm:gap-2 min-h-[44px] px-3 sm:px-4 text-sm"
                >
                  {isSkipping ? (
                    "Skipping..."
                  ) : (
                    <>
                      <span>🪙</span>
                      <span className="hidden xs:inline">Skip Song</span>
                      <span className="xs:hidden">Skip</span>
                      <span className="text-xs opacity-75">(1)</span>
                    </>
                  )}
                </Button>
              )}
              {/* Free song button - min 44px touch target */}
              {onGetFreeSong && (
                <Button
                  variant="outline"
                  onClick={onGetFreeSong}
                  disabled={
                    tokens < 3 ||
                    isGettingFreeSong ||
                    isSubmitting ||
                    isSkipping
                  }
                  className="gap-1.5 sm:gap-2 min-h-[44px] px-3 sm:px-4 text-sm"
                >
                  {isGettingFreeSong ? (
                    "Getting..."
                  ) : (
                    <>
                      <span>🪙</span>
                      <span className="hidden xs:inline">Free Song</span>
                      <span className="xs:hidden">Free</span>
                      <span className="text-xs opacity-75">(3)</span>
                    </>
                  )}
                </Button>
              )}
            </div>
            {tokens < 1 && (
              <span className="text-xs sm:text-sm text-muted-foreground">
                No tokens available
              </span>
            )}
          </div>
        )}

        {placementIndex !== null && (
          <div className="space-y-4 px-2">
            {/* Optional guess inputs */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-3">
              <div className="text-xs sm:text-sm text-center text-muted-foreground">
                🎯 Guess the song for +1 token! (optional)
              </div>
              <div className="grid grid-cols-1 gap-2 sm:gap-3 max-w-md mx-auto">
                <Input
                  placeholder="Song name..."
                  value={guessedName}
                  onChange={(e) => setGuessedName(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[44px] text-base"
                />
                <Input
                  placeholder="Artist..."
                  value={guessedArtist}
                  onChange={(e) => setGuessedArtist(e.target.value)}
                  disabled={isSubmitting}
                  className="min-h-[44px] text-base"
                />
              </div>
              {guessedName && guessedArtist && (
                <div className="text-xs text-center text-green-600">
                  ✓ Guess will be submitted
                </div>
              )}
            </div>
            <div className="flex justify-center gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
                className="min-h-[44px] min-w-[80px]"
              >
                Reset
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="min-h-[44px] min-w-[120px]"
              >
                {isSubmitting ? "Confirming..." : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeId === "current-song" && (
          <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-lg p-4 shadow-xl scale-105">
            <div className="text-center">
              <div className="text-2xl mb-1">🎵</div>
              <div className="text-sm font-medium">Mystery Song</div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
