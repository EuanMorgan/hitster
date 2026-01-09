import { TimelineDropZone } from "@/components/timeline-drop-zone";
import { Card } from "@/components/ui/card";
import type { SafeCurrentTurnSong, TimelineSong } from "@/db/schema";

interface MyTurnCardProps {
  timeline: TimelineSong[];
  currentSong: SafeCurrentTurnSong;
  onConfirm: (
    placementIndex: number,
    guessedName?: string,
    guessedArtist?: string,
  ) => void;
  onTimeUp: () => void;
  onSkip: () => void;
  onGetFreeSong: () => void;
  isSubmitting: boolean;
  isSkipping: boolean;
  isGettingFreeSong: boolean;
  turnDuration: number;
  turnStartedAt: string | null;
  playbackStartedAt: number | null;
  tokens: number;
  timerPaused: boolean;
}

export function MyTurnCard({
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
  playbackStartedAt,
  tokens,
  timerPaused,
}: MyTurnCardProps) {
  return (
    <Card className="border-2 border-primary p-3 sm:p-4">
      <TimelineDropZone
        timeline={timeline}
        currentSong={currentSong}
        onConfirm={onConfirm}
        onTimeUp={onTimeUp}
        onSkip={onSkip}
        onGetFreeSong={onGetFreeSong}
        isSubmitting={isSubmitting}
        isSkipping={isSkipping}
        isGettingFreeSong={isGettingFreeSong}
        turnDuration={turnDuration}
        turnStartedAt={turnStartedAt}
        playbackStartedAt={playbackStartedAt}
        tokens={tokens}
        timerPaused={timerPaused}
      />
    </Card>
  );
}
