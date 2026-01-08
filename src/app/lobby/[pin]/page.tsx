"use client";

import { useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { GameSettings } from "@/components/game-settings";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { env } from "@/env";
import { useGameSession } from "@/hooks/use-game-session";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export default function LobbyPage() {
  const params = useParams();
  const pin = (params.pin as string).toUpperCase();
  const router = useRouter();

  const trpc = useTRPC();
  const { data: authSession } = useSession();

  const sessionQuery = useGameSession({ pin });

  const startGame = useMutation({
    ...trpc.game.startGame.mutationOptions(),
    onSuccess: () => {
      router.push(`/game/${pin}`);
    },
  });

  // Get current player ID from localStorage for heartbeat
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  useEffect(() => {
    const storedPlayerId = localStorage.getItem("hitster_player_id");
    setCurrentPlayerId(storedPlayerId);
  }, []);

  // Heartbeat to track player presence
  const heartbeatMutation = useMutation({
    ...trpc.game.heartbeat.mutationOptions(),
  });

  useEffect(() => {
    if (!currentPlayerId) return;
    const sendHeartbeat = () =>
      heartbeatMutation.mutate({ playerId: currentPlayerId });
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [currentPlayerId, heartbeatMutation]);

  // Redirect to game page when state changes to playing
  useEffect(() => {
    if (sessionQuery.data?.state === "playing") {
      router.push(`/game/${pin}`);
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
  const joinUrl = `${env.NEXT_PUBLIC_APP_URL}/join?pin=${session?.pin}`;
  const isHost = authSession?.user?.id === session?.hostId;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between">
            <CardTitle>Game Lobby</CardTitle>
            <ThemeToggle />
          </div>
          <CardDescription>Share this PIN to invite players</CardDescription>
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="p-4 bg-muted rounded-lg w-full">
              <p className="text-xs text-muted-foreground mb-1">Game PIN</p>
              <p className="text-4xl font-mono font-bold tracking-widest">
                {session?.pin}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <p className="text-xs text-muted-foreground">
              Scan to join or go to {env.NEXT_PUBLIC_APP_URL}/join
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">
                Players ({session?.players.length}/{session?.maxPlayers})
              </h3>
              <div className="space-y-2">
                {session?.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 p-2 rounded-lg bg-muted relative ${
                      !player.isConnected ? "opacity-60" : ""
                    }`}
                  >
                    <span
                      className={`text-2xl ${!player.isConnected ? "grayscale" : ""}`}
                    >
                      {player.avatar}
                    </span>
                    <span className="font-medium">{player.name}</span>
                    {!player.isConnected && (
                      <span className="ml-auto text-xs bg-gray-600 text-white px-2 py-1 rounded">
                        Disconnected
                      </span>
                    )}
                    {player.isHost && player.isConnected && (
                      <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isHost && session && (
              <>
                <GameSettings
                  pin={session.pin}
                  initialSettings={{
                    songsToWin: session.songsToWin,
                    songPlayDuration: session.songPlayDuration,
                    turnDuration: session.turnDuration,
                    stealWindowDuration: session.stealWindowDuration,
                    maxPlayers: session.maxPlayers,
                    playlistUrl: session.playlistUrl,
                  }}
                />

                <Button
                  onClick={() => startGame.mutate({ pin })}
                  disabled={startGame.isPending}
                  className="w-full"
                  size="lg"
                >
                  {startGame.isPending ? "Starting..." : "Start Game"}
                </Button>

                {startGame.error && (
                  <p className="text-sm text-destructive text-center">
                    {startGame.error.message}
                  </p>
                )}
              </>
            )}

            <p className="text-sm text-muted-foreground text-center">
              {isHost
                ? "Configure settings above, then start the game"
                : "Waiting for host to start the game..."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
