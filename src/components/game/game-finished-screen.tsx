"use client";

import { Confetti } from "@neoconfetti/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineSong } from "@/db/schema";

interface PlayerStats {
  correctPlacements: number;
  totalPlacements: number;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  tokens: number;
  timeline: TimelineSong[] | null;
  wins?: number;
}

interface GameFinishedScreenProps {
  players: Player[];
  playerStats?: Record<string, PlayerStats> | null;
  gamesPlayed: number;
  pin: string;
  isHost: boolean;
  onRematch: () => void;
  isRematchPending: boolean;
}

export function GameFinishedScreen({
  players,
  playerStats,
  gamesPlayed,
  pin,
  isHost,
  onRematch,
  isRematchPending,
}: GameFinishedScreenProps) {
  const sortedPlayers = [...players].sort(
    (a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0),
  );
  const winner = sortedPlayers[0];

  const totalGamesPlayed = gamesPlayed;
  const sortedByWins = [...players].sort(
    (a, b) => (b.wins ?? 0) - (a.wins ?? 0),
  );
  const partyMVP = sortedByWins[0];
  const hasPartyStats = players.some((p) => (p.wins ?? 0) > 0);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Winner confetti animation */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50">
        <Confetti
          particleCount={200}
          colors={[
            "#FFD700",
            "#FF6B6B",
            "#4ECDC4",
            "#45B7D1",
            "#96CEB4",
            "#9B59B6",
          ]}
          duration={4000}
          force={0.6}
          stageWidth={typeof window !== "undefined" ? window.innerWidth : 1000}
          stageHeight={typeof window !== "undefined" ? window.innerHeight : 800}
        />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Winner celebration header */}
          <div className="flex justify-center gap-2 text-3xl mb-2">
            <span className="animate-bounce">🎉</span>
            <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>
              🏆
            </span>
            <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
              🎉
            </span>
          </div>
          <CardTitle className="text-2xl">Game Over!</CardTitle>
          {winner && (
            <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <div className="text-4xl mb-2">{winner.avatar}</div>
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {winner.name} Wins!
              </div>
              <div className="text-sm text-muted-foreground">
                {winner.timeline?.length ?? 0} songs in timeline
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 text-center">Final Standings</h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, idx) => {
                const stats = playerStats?.[player.id];
                const accuracy =
                  stats && stats.totalPlacements > 0
                    ? Math.round(
                        (stats.correctPlacements / stats.totalPlacements) * 100,
                      )
                    : null;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      idx === 0
                        ? "bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400"
                        : idx === 1
                          ? "bg-gray-100 dark:bg-gray-800/50 border border-gray-300"
                          : idx === 2
                            ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-300"
                            : "bg-muted"
                    }`}
                  >
                    <span className="text-2xl min-w-[32px] text-center">
                      {idx === 0
                        ? "🥇"
                        : idx === 1
                          ? "🥈"
                          : idx === 2
                            ? "🥉"
                            : `#${idx + 1}`}
                    </span>
                    <span className="text-2xl">{player.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {player.name}
                        </span>
                        {player.isHost && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded shrink-0">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>🪙 {player.tokens}</span>
                        {accuracy !== null && (
                          <span>
                            • {stats!.correctPlacements}/
                            {stats!.totalPlacements} ({accuracy}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold">
                        {player.timeline?.length ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">songs</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Party Stats */}
          {hasPartyStats && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 text-center flex items-center justify-center gap-2">
                <span>🎊</span>
                <span>Party Stats</span>
                <span>🎊</span>
              </h3>

              {/* Party MVP */}
              {partyMVP && (partyMVP.wins ?? 0) > 0 && (
                <div className="mb-3 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-center border border-purple-300">
                  <div className="text-xs text-muted-foreground mb-1">
                    Party MVP
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{partyMVP.avatar}</span>
                    <span className="font-bold">{partyMVP.name}</span>
                    <span className="text-purple-600 dark:text-purple-400">
                      ({partyMVP.wins} {partyMVP.wins === 1 ? "win" : "wins"})
                    </span>
                  </div>
                </div>
              )}

              {/* All players' wins */}
              <div className="text-sm text-center text-muted-foreground mb-2">
                Games played: {totalGamesPlayed}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sortedByWins.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
                  >
                    <span>{player.avatar}</span>
                    <span className="flex-1 truncate">{player.name}</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {player.wins ?? 0}🏆
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {isHost && (
              <div>
                <Button
                  onClick={onRematch}
                  disabled={isRematchPending}
                  className="w-full"
                  size="lg"
                >
                  {isRematchPending ? "Starting..." : "🔄 Play Again"}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  New players can join via PIN: {pin}
                </p>
              </div>
            )}

            {!isHost && (
              <div className="text-center text-sm text-muted-foreground">
                Waiting for host to start a rematch...
              </div>
            )}

            <Button asChild variant="outline" className="w-full" size="lg">
              <Link href="/">🏠 Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
