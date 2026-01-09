"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ActiveGamesCard() {
  const { data: session } = useSession();
  const trpc = useTRPC();

  const { data: activeGames } = useQuery({
    ...trpc.game.getActiveGames.queryOptions(),
    enabled: !!session?.user,
  });

  if (!session?.user || !activeGames?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Your Active Games
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activeGames.map((game) => (
          <div
            key={game.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono font-bold">{game.pin}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  game.state === "lobby"
                    ? "bg-amber-500/20 text-amber-500"
                    : "bg-green-500/20 text-green-500"
                }`}
              >
                {game.state === "lobby" ? "Lobby" : "Playing"}
              </span>
              <span className="text-xs text-muted-foreground">
                {game.playerCount} player{game.playerCount !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {getRelativeTime(game.createdAt)}
              </span>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link
                href={
                  game.state === "lobby"
                    ? `/lobby/${game.pin}`
                    : `/game/${game.pin}`
                }
              >
                Rejoin
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
