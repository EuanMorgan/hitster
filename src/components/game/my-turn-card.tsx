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
  onBuyTime: () => void;
  isSubmitting: boolean;
  isSkipping: boolean;
  isGettingFreeSong: boolean;
  isBuyingTime: boolean;
  turnDuration: number;
  turnStartedAt: string | null;
  playbackStartedAt: number | null;
  bonusTimeSeconds: number;
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
  onBuyTime,
  isSubmitting,
  isSkipping,
  isGettingFreeSong,
  isBuyingTime,
  turnDuration,
  turnStartedAt,
  playbackStartedAt,
  bonusTimeSeconds,
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
        onBuyTime={onBuyTime}
        isSubmitting={isSubmitting}
        isSkipping={isSkipping}
        isGettingFreeSong={isGettingFreeSong}
        isBuyingTime={isBuyingTime}
        turnDuration={turnDuration}
        turnStartedAt={turnStartedAt}
        playbackStartedAt={playbackStartedAt}
        bonusTimeSeconds={bonusTimeSeconds}
        tokens={tokens}
        timerPaused={timerPaused}
      />
    </Card>
  );
}
