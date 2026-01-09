import type { TimelineSong } from "@/db/schema";
import { getTimelineSortedByYear } from "@/lib/game-selectors";

export function TimelineDisplay({ timeline }: { timeline: TimelineSong[] }) {
  if (timeline.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <span>🎵</span>
        <span>No songs yet — your musical journey starts here!</span>
      </div>
    );
  }

  const sortedTimeline = getTimelineSortedByYear(timeline);

  return (
    <div className="overflow-x-auto scroll-smooth">
      <div className="flex gap-2 sm:gap-3 min-w-min pb-2 snap-x snap-mandatory">
        {sortedTimeline.map((song) => (
          <div
            key={song.songId}
            className="bg-gradient-to-br from-card to-muted/50 border-2 border-green-500/30 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-center min-w-[100px] sm:min-w-[120px] shrink-0 snap-start"
          >
            <div className="font-bold text-xl sm:text-2xl text-primary">
              {song.year}
            </div>
            <div className="text-sm text-foreground line-clamp-2 max-w-[95px] sm:max-w-[115px]">
              {song.name}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[95px] sm:max-w-[115px]">
              {song.artist}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
