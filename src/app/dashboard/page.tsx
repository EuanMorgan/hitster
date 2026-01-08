"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

function DashboardSkeleton() {
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

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery(
    trpc.game.getHostGameHistory.queryOptions(),
  );

  useEffect(() => {
    if (!sessionPending && !session?.user) {
      router.push("/");
    }
  }, [session, sessionPending, router]);

  if (sessionPending || isLoading) {
    return <DashboardSkeleton />;
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
            <CardDescription>Failed to load game history</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const games = data?.games ?? [];
  const stats = data?.stats ?? {
    totalGames: 0,
    averageAccuracy: 0,
    totalPlacements: 0,
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">&larr; Home</Link>
          </Button>
          <h1 className="font-bold text-2xl">Game History</h1>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Games</CardDescription>
            <CardTitle className="text-3xl">{stats.totalGames}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Turns</CardDescription>
            <CardTitle className="text-3xl">{stats.totalPlacements}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Accuracy</CardDescription>
            <CardTitle className="text-3xl">{stats.averageAccuracy}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Games</CardTitle>
          <CardDescription>
            {games.length === 0
              ? "No games played yet"
              : `${games.length} game${games.length === 1 ? "" : "s"} hosted`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {games.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Host your first game to see history here!</p>
              <Button className="mt-4" asChild>
                <Link href="/">Create Game</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead className="text-right">Turns</TableHead>
                    <TableHead className="text-right">Rounds</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(game.completedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {game.finalStandings?.slice(0, 4).map((s, i) => (
                            <span
                              key={s.playerId}
                              title={s.playerName}
                              className={i > 0 ? "-ml-1" : ""}
                            >
                              {s.avatar}
                            </span>
                          ))}
                          {(game.playerCount ?? 0) > 4 && (
                            <span className="ml-1 text-muted-foreground text-xs">
                              +{(game.playerCount ?? 0) - 4}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {game.winnerName ? (
                          <span className="font-medium">{game.winnerName}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {game.gameData?.totalTurns ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {game.gameData?.totalRounds ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
