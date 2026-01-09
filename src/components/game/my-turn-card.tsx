import { TimelineDropZone } from "@/components/timeline-drop-zone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="border-2 border-primary">
      <CardHeader className="text-center py-3 sm:py-4 px-3 sm:px-6">
        <CardTitle className="text-green-500 text-lg sm:text-xl">
          Your Turn!
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Place the mystery song in your timeline
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6 pb-4">
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
      </CardContent>
    </Card>
  );
}
