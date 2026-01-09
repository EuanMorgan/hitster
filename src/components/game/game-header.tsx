import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GameHeaderProps {
  pin: string;
  roundNumber: number;
  songsToWin: number;
  turnDuration: number;
  isStealPhase: boolean;
}

export function GameHeader({
  pin,
  roundNumber,
  songsToWin,
  turnDuration,
  isStealPhase,
}: GameHeaderProps) {
  return (
    <Card>
      <CardHeader className="text-center pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between">
          <div className="w-9" />
          <CardTitle className="text-xl sm:text-2xl">Hitster</CardTitle>
          <ThemeToggle />
        </div>
        <CardDescription className="text-xs sm:text-sm">
          PIN: {pin} • Round {roundNumber}
          {isStealPhase && (
            <span className="ml-1 sm:ml-2 text-amber-500 font-medium">
              🎯 STEAL
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="flex justify-center gap-4 sm:gap-8 text-xs sm:text-sm">
          <div>
            <span className="text-muted-foreground">Goal:</span>{" "}
            <span className="font-medium">{songsToWin}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Time:</span>{" "}
            <span className="font-medium">{turnDuration}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
