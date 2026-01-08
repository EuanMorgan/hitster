"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export default function GamePage() {
  const params = useParams();
  const pin = (params.pin as string).toUpperCase();
  const router = useRouter();

  const trpc = useTRPC();

  const sessionQuery = useQuery({
    ...trpc.game.getSession.queryOptions({ pin }),
    refetchInterval: 2000,
  });

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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle>Game in Progress</CardTitle>
          <CardDescription>PIN: {session?.pin}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-lg font-medium">
                Game is now active! Gameplay features coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Players have been assigned their starting songs and turn order
                has been randomized.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-3">Players</h3>
              <div className="grid gap-2">
                {session?.players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted"
                  >
                    <span className="text-2xl">{player.avatar}</span>
                    <div className="flex-1">
                      <span className="font-medium">{player.name}</span>
                      {player.isHost && (
                        <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          Host
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Turn #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
