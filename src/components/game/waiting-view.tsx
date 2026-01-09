import { Card, CardContent } from "@/components/ui/card";

interface WaitingViewProps {
  playerName: string;
  playerAvatar: string;
}

export function WaitingView({ playerName, playerAvatar }: WaitingViewProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="py-4 sm:py-6 px-3 sm:px-6">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <span className="text-2xl sm:text-3xl">{playerAvatar}</span>
          <div className="text-center">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Current Turn
            </div>
            <div className="text-lg sm:text-xl font-bold">{playerName}</div>
          </div>
        </div>
        <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
          Waiting for {playerName} to place...
        </div>
      </CardContent>
    </Card>
  );
}
