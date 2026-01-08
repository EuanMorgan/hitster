"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

function GameDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-10" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GameDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { data: session, isPending: sessionPending } = useSession();
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery(
    trpc.game.getGameDetails.queryOptions({ gameId }),
  );

  useEffect(() => {
    if (!sessionPending && !session?.user) {
      router.push("/");
    }
  }, [session, sessionPending, router]);

  if (sessionPending || isLoading) {
    return <GameDetailSkeleton />;
  }

  if (!session?.user) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load game details</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { playerStats, aggregateStats, gameData } = data;

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">&larr; Dashboard</Link>
          </Button>
          <h1 className="font-bold text-2xl">Game Details</h1>
        </div>
        <ThemeToggle />
      </div>

      {/* Winner & Game Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription>{formatDate(data.completedAt)}</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {data.winnerAvatar && (
                  <span className="mr-2">{data.winnerAvatar}</span>
                )}
                {data.winnerName ? (
                  <span>{data.winnerName} won!</span>
                ) : (
                  <span className="text-muted-foreground">No winner</span>
                )}
              </CardTitle>
            </div>
            <div className="text-right text-muted-foreground text-sm">
              <div>{data.playerCount} players</div>
              <div>
                {gameData?.totalRounds ?? "-"} rounds,{" "}
                {gameData?.totalTurns ?? "-"} turns
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Accuracy</CardDescription>
            <CardTitle className="text-2xl">
              {aggregateStats.correctPlacements}/
              {aggregateStats.totalPlacements}{" "}
              <span className="font-normal text-muted-foreground text-lg">
                ({aggregateStats.accuracy}%)
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Guesses</CardDescription>
            <CardTitle className="text-2xl">
              {aggregateStats.correctGuesses}/{aggregateStats.totalGuesses}{" "}
              <span className="font-normal text-muted-foreground text-lg">
                ({aggregateStats.guessAccuracy}%)
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Steals</CardDescription>
            <CardTitle className="text-2xl">
              {aggregateStats.successfulSteals}/
              {aggregateStats.totalStealAttempts}{" "}
              <span className="font-normal text-muted-foreground text-lg">
                ({aggregateStats.stealSuccessRate}%)
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Target</CardDescription>
            <CardTitle className="text-2xl">
              {gameData?.songsToWin ?? 10} songs
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Player Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle>Player Stats</CardTitle>
          <CardDescription>
            Detailed performance for each player
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Songs</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead className="text-center">Guesses</TableHead>
                  <TableHead className="text-center">Steals</TableHead>
                  <TableHead className="text-center">Avg Time</TableHead>
                  <TableHead className="text-center">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerStats.map((player, index) => (
                  <TableRow
                    key={player.playerId}
                    className={index === 0 ? "bg-primary/5" : ""}
                  >
                    <TableCell className="font-medium">
                      {index === 0 ? "🏆" : index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{player.avatar}</span>
                        <span className="font-medium">{player.playerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {player.timelineCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="tabular-nums">
                        {player.correctPlacements}/{player.totalPlacements}
                      </span>
                      <span className="ml-1 text-muted-foreground text-xs">
                        ({player.accuracy}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {player.totalGuesses > 0 ? (
                        <>
                          <span className="tabular-nums">
                            {player.correctGuesses}/{player.totalGuesses}
                          </span>
                          <span className="ml-1 text-muted-foreground text-xs">
                            ({player.guessAccuracy}%)
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {player.totalStealAttempts > 0 ? (
                        <>
                          <span className="tabular-nums">
                            {player.successfulSteals}/
                            {player.totalStealAttempts}
                          </span>
                          <span className="ml-1 text-muted-foreground text-xs">
                            ({player.stealSuccessRate}%)
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {player.avgTurnDurationSec !== null ? (
                        <span className="tabular-nums">
                          {player.avgTurnDurationSec}s
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="tabular-nums">
                        🪙 {player.tokensRemaining}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
