"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import type { TimelineSong } from "@/db/schema";

function TokenDisplay({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-yellow-500">
          🪙
        </span>
      ))}
      {count === 0 && <span className="text-muted-foreground text-sm">No tokens</span>}
    </div>
  );
}

function TimelineDisplay({ timeline }: { timeline: TimelineSong[] }) {
  if (timeline.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">No songs yet</div>
    );
  }

  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year);

  return (
    <div className="flex flex-wrap gap-2">
      {sortedTimeline.map((song) => (
        <div
          key={song.songId}
          className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-center min-w-[80px]"
        >
          <div className="font-bold text-lg">{song.year}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[100px]">
            {song.name}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayerCard({
  player,
  isCurrentTurn,
  turnNumber,
}: {
  player: {
    id: string;
    name: string;
    avatar: string;
    isHost: boolean;
    tokens: number;
    timeline: TimelineSong[] | null;
  };
  isCurrentTurn: boolean;
  turnNumber: number;
}) {
  return (
    <div
      className={`rounded-lg p-4 transition-all ${
        isCurrentTurn
          ? "bg-primary/20 border-2 border-primary ring-2 ring-primary/30"
          : "bg-muted"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{player.avatar}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{player.name}</span>
              {player.isHost && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  Host
                </span>
              )}
              {isCurrentTurn && (
                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded animate-pulse">
                  Playing
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Turn #{turnNumber}
            </div>
          </div>
        </div>
        <div className="text-right">
          <TokenDisplay count={player.tokens} />
          <div className="text-sm text-muted-foreground mt-1">
            {(player.timeline?.length ?? 0)} song{(player.timeline?.length ?? 0) !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <TimelineDisplay timeline={player.timeline ?? []} />
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const pin = (params.pin as string).toUpperCase();
  const router = useRouter();
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(true);

  const trpc = useTRPC();

  const sessionQuery = useQuery({
    ...trpc.game.getSession.queryOptions({ pin }),
    refetchInterval: 2000,
  });

  // Hide shuffle animation after 2 seconds
  useEffect(() => {
    if (showShuffleAnimation) {
      const timer = setTimeout(() => setShowShuffleAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showShuffleAnimation]);

  // Redirect back to lobby if game is not playing
  useEffect(() => {
    if (sessionQuery.data?.state === "lobby") {
      router.push(`/lobby/${pin}`);
    }
  }, [sessionQuery.data?.state, router, pin]);

  if (sessionQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (sessionQuery.error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{sessionQuery.error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const session = sessionQuery.data;

  if (session?.state === "finished") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Game Finished</CardTitle>
            <CardDescription>This game has ended</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPlayer = session?.players.find(
    (p) => p.id === session.currentPlayerId
  );

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Game Header */}
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Hitster</CardTitle>
            <CardDescription>PIN: {session?.pin}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <span className="text-muted-foreground">Goal:</span>{" "}
                <span className="font-medium">{session?.songsToWin} songs</span>
              </div>
              <div>
                <span className="text-muted-foreground">Turn time:</span>{" "}
                <span className="font-medium">{session?.turnDuration}s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shuffle Animation Overlay */}
        {showShuffleAnimation && (
          <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
            <CardContent className="py-8 text-center">
              <div className="text-4xl mb-4 animate-bounce">🎲</div>
              <div className="text-lg font-medium">Shuffling turn order...</div>
              <div className="text-sm text-muted-foreground mt-2">
                Each player receives 1 starting song
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Turn Indicator */}
        {!showShuffleAnimation && currentPlayer && (
          <Card className="bg-primary/10 border-primary">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{currentPlayer.avatar}</span>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    Current Turn
                  </div>
                  <div className="text-xl font-bold">{currentPlayer.name}</div>
                </div>
              </div>
              <div className="text-center mt-3 text-sm text-muted-foreground">
                Song playback coming with Spotify integration
              </div>
            </CardContent>
          </Card>
        )}

        {/* Players List */}
        {!showShuffleAnimation && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Players</h2>
            <div className="grid gap-4">
              {session?.players.map((player, index) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentTurn={player.id === session.currentPlayerId}
                  turnNumber={index + 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
