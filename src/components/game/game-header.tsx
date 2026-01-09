import { Square } from "lucide-react";
import { YearLookupProgress } from "@/components/game/year-lookup-progress";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface GameHeaderProps {
  pin: string;
  roundNumber: number;
  songsToWin: number;
  turnDuration: number;
  isStealPhase: boolean;
  yearLookupStatus?: "pending" | "in_progress" | "complete" | null;
  yearLookupProgress?: number;
  yearLookupTotal?: number;
  isHost?: boolean;
  onEndGame?: () => void;
  isEndingGame?: boolean;
}

export function GameHeader({
  pin,
  roundNumber,
  songsToWin,
  turnDuration,
  isStealPhase,
  yearLookupStatus,
  yearLookupProgress = 0,
  yearLookupTotal = 0,
  isHost = false,
  onEndGame,
  isEndingGame = false,
}: GameHeaderProps) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span>
            <span className="text-muted-foreground">PIN:</span>{" "}
            <span className="font-bold">{pin}</span>
          </span>
          <span className="text-muted-foreground">•</span>
          <span>
            <span className="text-muted-foreground">Round</span>{" "}
            <span className="font-medium">{roundNumber}</span>
          </span>
          <span className="text-muted-foreground">•</span>
          <span>
            <span className="text-muted-foreground">Goal:</span>{" "}
            <span className="font-medium">{songsToWin}</span>
          </span>
          <span className="text-muted-foreground">•</span>
          <span>
            <span className="text-muted-foreground">Time:</span>{" "}
            <span className="font-medium">{turnDuration}s</span>
          </span>
          {isStealPhase && (
            <span className="text-amber-500 font-medium">🎯 STEAL</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {yearLookupStatus && yearLookupStatus !== "complete" && (
            <YearLookupProgress
              status={yearLookupStatus}
              progress={yearLookupProgress}
              total={yearLookupTotal}
            />
          )}
          {isHost && onEndGame && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={isEndingGame}
                  title="End game"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End game early?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The player with the most songs in their timeline will win.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onEndGame}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    End Game
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <ThemeToggle />
        </div>
      </div>
    </Card>
  );
}
