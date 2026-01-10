import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineSong } from "@/db/schema";

interface MyTimelineCardProps {
  timeline: TimelineSong[];
}

export function MyTimelineCard({ timeline }: MyTimelineCardProps) {
  const sorted = [...timeline].sort((a, b) => a.year - b.year);

  return (
    <Card>
      <CardHeader className="py-2 pb-1">
        <CardTitle className="text-sm text-muted-foreground">
          My Timeline ({timeline.length}{" "}
          {timeline.length === 1 ? "song" : "songs"})
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 pt-0">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sorted.map((song) => (
            <div
              key={song.songId}
              className="flex-shrink-0 min-w-[70px] text-center p-2 bg-muted rounded-lg"
            >
              <div className="font-bold text-primary">{song.year}</div>
              <div className="text-xs truncate max-w-[65px]">
                {song.displayName ?? song.name}
              </div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[65px]">
                {song.artist}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
