import type { TimelineSong } from "@/db/schema";

interface Player {
  id: string;
  name: string;
  avatar: string;
  timeline: TimelineSong[] | null;
}

interface PlayerProgressBarProps {
  players: Player[];
  currentPlayerId: string | null;
  songsToWin: number;
}

export function PlayerProgressBar({
  players,
  currentPlayerId,
  songsToWin,
}: PlayerProgressBarProps) {
  // Sort by timeline length descending
  const sortedPlayers = [...players].sort(
    (a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0),
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-3 bg-muted/50 rounded-lg">
      {sortedPlayers.map((player) => {
        const songCount = player.timeline?.length ?? 0;
        const progress = (songCount / songsToWin) * 100;
        const isPlaying = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isPlaying ? "bg-primary/20 ring-2 ring-primary" : "bg-background"
            }`}
          >
            <span className="text-2xl">{player.avatar}</span>
            <div className="flex flex-col min-w-[60px]">
              <span className="text-sm font-medium truncate max-w-[80px]">
                {player.name}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-primary">
                  {songCount}/{songsToWin}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
