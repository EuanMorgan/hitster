import type { TimelineSong } from "@/db/schema";
import { TimelineDisplay } from "./timeline-display";
import { TokenDisplay } from "./token-display";

interface PlayerCardProps {
  player: {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    tokens: number;
    timeline: TimelineSong[] | null;
    isConnected: boolean;
  };
  isCurrentTurn: boolean;
  turnNumber: number;
}

export function PlayerCard({
  player,
  isCurrentTurn,
  turnNumber,
}: PlayerCardProps) {
  const isLowTokens = player.tokens < 2;

  return (
    <div
      className={`rounded-lg p-3 sm:p-4 transition-all relative overflow-hidden ${
        isCurrentTurn
          ? "bg-primary/10 border-l-4 border-l-primary shadow-[0_0_15px_rgba(var(--primary-rgb,59,130,246),0.15)]"
          : "bg-muted border-l-4 border-l-transparent"
      } ${!player.isConnected ? "opacity-60" : ""}`}
    >
      {!player.isConnected && (
        <div className="absolute inset-0 bg-gray-500/30 rounded-lg flex items-center justify-center backdrop-blur-[1px]">
          <span className="text-[10px] sm:text-xs bg-gray-700 text-white px-2 py-1 rounded font-medium flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Reconnecting...
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span
            className={`text-[48px] sm:text-[56px] leading-none shrink-0 ${!player.isConnected ? "grayscale" : ""}`}
          >
            {player.avatar}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-[180px]">
                {player.name}
              </span>
              {player.isHost && (
                <span className="text-[10px] sm:text-xs bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 rounded shrink-0">
                  Host
                </span>
              )}
              {isCurrentTurn && player.isConnected && (
                <span className="text-[10px] sm:text-xs bg-green-500 text-white px-1.5 sm:px-2 py-0.5 rounded animate-pulse shrink-0">
                  Playing
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Turn #{turnNumber}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div
            className={isLowTokens ? "text-amber-500" : "text-muted-foreground"}
          >
            <TokenDisplay count={player.tokens} />
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">
            {player.timeline?.length ?? 0} song
            {(player.timeline?.length ?? 0) !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <TimelineDisplay timeline={player.timeline ?? []} />
    </div>
  );
}
