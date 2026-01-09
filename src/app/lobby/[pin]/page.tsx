"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/env";
import { useGameSession } from "@/hooks/use-game-session";
import { usePlayerHeartbeat } from "@/hooks/use-player-heartbeat";
import { usePlayerValidation } from "@/hooks/use-player-validation";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

function AnimatedDots() {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block w-6 text-left">{".".repeat(dotCount)}</span>
  );
}

function LobbySkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md animate-in fade-in duration-150">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
          <Skeleton className="h-4 w-48 mx-auto mt-2" />
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="p-4 bg-muted rounded-lg w-full">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-10 w-32 mx-auto" />
            </div>
            <Skeleton className="h-[160px] w-[160px] rounded-lg" />
            <Skeleton className="h-3 w-52" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                  >
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LobbyPage() {
  const params = useParams();
  const pin = (params.pin as string).toUpperCase();
  const router = useRouter();

  const trpc = useTRPC();
  const { data: authSession } = useSession();

  const sessionQuery = useGameSession({ pin });

  // Get local network IP for QR code in dev mode
  const localIPQuery = useQuery(trpc.game.getLocalIP.queryOptions());

  const startGame = useMutation({
    ...trpc.game.startGame.mutationOptions(),
    onSuccess: () => {
      router.push(`/game/${pin}`);
    },
  });

  const { playerId: currentPlayerId } = usePlayerValidation({
    pin,
    sessionData: sessionQuery.data,
    isSessionLoading: sessionQuery.isLoading,
    requirePlayer: true,
  });

  usePlayerHeartbeat(currentPlayerId);

  // Redirect to game page when state changes to playing
  useEffect(() => {
    if (sessionQuery.data?.state === "playing") {
      router.push(`/game/${pin}`);
    }
  }, [sessionQuery.data?.state, router, pin]);

  if (sessionQuery.isLoading) {
    return <LobbySkeleton />;
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

  // Use local network IP for QR code in dev mode (so phones on same WiFi can scan)
  const baseUrl = localIPQuery.data?.ip
    ? `http://${localIPQuery.data.ip}:3000`
    : env.NEXT_PUBLIC_APP_URL;
  const joinUrl = `${baseUrl}/join?pin=${session?.pin}`;

  const isHost = authSession?.user?.id === session?.hostId;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md animate-in fade-in duration-150">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between">
            <CardTitle>Game Lobby</CardTitle>
            <ThemeToggle />
          </div>
          <CardDescription>Share this PIN to invite players</CardDescription>
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="p-4 bg-muted rounded-lg w-full">
              <p className="text-xs text-muted-foreground mb-1">Game PIN</p>
              <p className="text-5xl font-mono font-bold tracking-[0.3em]">
                {session?.pin}
              </p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow-md">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <p className="text-xs text-muted-foreground">
              Scan to join or go to {baseUrl}/join
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
                {session?.players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 p-2 rounded-lg bg-muted relative transition-all duration-150 hover:bg-muted/80 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2 ${
                      !player.isConnected ? "opacity-60" : ""
                    }`}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: "backwards",
                    }}
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
                {session?.players.length === 1 && isHost && (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground text-center border-2 border-dashed rounded-lg">
                    <span>👥</span>
                    <span>Share the PIN and wait for friends to join!</span>
                  </div>
                )}
              </div>
            </div>

            {isHost && session && (
              <>
                <GameSettings
                  pin={session.pin}
                  initialSettings={{
                    songsToWin: session.songsToWin,
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
              {isHost ? (
                "Configure settings above, then start the game"
              ) : (
                <>
                  Waiting for friends to join
                  <AnimatedDots />
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
