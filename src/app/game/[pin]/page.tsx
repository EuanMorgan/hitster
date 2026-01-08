"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SpotifyPlayer } from "@/components/spotify-player";
import { StealPhase } from "@/components/steal-phase";
import { TimelineDropZone } from "@/components/timeline-drop-zone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TimelineSong } from "@/db/schema";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

function TokenDisplay({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-yellow-500">
          🪙
        </span>
      ))}
      {count === 0 && (
        <span className="text-muted-foreground text-sm">No tokens</span>
      )}
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
            {player.timeline?.length ?? 0} song
            {(player.timeline?.length ?? 0) !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <TimelineDisplay timeline={player.timeline ?? []} />
    </div>
  );
}

function ActivePlayerTimeline({
  player,
  currentSong,
  turnStartedAt,
  turnDuration,
}: {
  player: {
    id: string;
    name: string;
    avatar: string;
    tokens: number;
    timeline: TimelineSong[] | null;
  };
  currentSong: { name: string; artist: string; year: number } | null;
  turnStartedAt: string | null;
  turnDuration: number;
}) {
  const sortedTimeline = [...(player.timeline ?? [])].sort(
    (a, b) => a.year - b.year,
  );

  // Calculate time remaining
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!turnStartedAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor(
        (Date.now() - new Date(turnStartedAt).getTime()) / 1000,
      );
      const remaining = Math.max(0, turnDuration - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [turnStartedAt, turnDuration]);

  return (
    <Card className="border-2 border-primary bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{player.avatar}</span>
            <div>
              <CardTitle className="text-2xl">
                {player.name}&apos;s Turn
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span>
                  <TokenDisplay count={player.tokens} />
                </span>
                <span>{player.timeline?.length ?? 0} songs in timeline</span>
              </CardDescription>
            </div>
          </div>
          {timeRemaining !== null && (
            <div
              className={`text-4xl font-mono font-bold ${
                timeRemaining <= 10
                  ? "text-red-500 animate-pulse"
                  : timeRemaining <= 20
                    ? "text-amber-500"
                    : "text-primary"
              }`}
            >
              {timeRemaining}s
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Current song indicator (placeholder - year hidden) */}
        {currentSong && (
          <div className="mb-4 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-center">
            <div className="text-sm text-muted-foreground mb-1">
              Mystery Song Playing
            </div>
            <div className="text-3xl">🎵❓🎵</div>
            <div className="text-xs text-muted-foreground mt-1">
              Waiting for placement...
            </div>
          </div>
        )}

        {/* Timeline display - large cards */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Timeline ({sortedTimeline.length} songs)
          </h4>
          {sortedTimeline.length === 0 ? (
            <div className="text-muted-foreground italic p-4 text-center border-2 border-dashed rounded-lg">
              No songs in timeline yet
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {sortedTimeline.map((song) => (
                <div
                  key={song.songId}
                  className="bg-card border-2 border-primary/30 rounded-xl px-4 py-3 text-center min-w-[120px] shadow-sm"
                >
                  <div className="font-bold text-2xl text-primary">
                    {song.year}
                  </div>
                  <div className="text-sm font-medium truncate max-w-[150px]">
                    {song.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {song.artist}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TurnResultOverlay({
  result,
  onClose,
  winnerName,
}: {
  result: {
    activePlayerCorrect: boolean;
    song: { name: string; artist: string; year: number };
    stolenBy?: { playerId: string; playerName: string } | null;
    recipientId?: string | null;
    gameEnded?: boolean;
    winnerId?: string;
    guessWasCorrect?: boolean;
    guessedName?: string | null;
    guessedArtist?: string | null;
  };
  onClose: () => void;
  winnerName?: string;
}) {
  useEffect(() => {
    // Longer timeout if game ended to enjoy the celebration
    const timer = setTimeout(onClose, result.gameEnded ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [onClose, result.gameEnded]);

  const wasStolen = !!result.stolenBy;
  const songLost = !result.activePlayerCorrect && !wasStolen;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 animate-in zoom-in-95">
        <CardContent className="py-8 text-center">
          {result.gameEnded ? (
            // Winner celebration
            <>
              <div className="text-6xl mb-4 animate-bounce">🏆</div>
              <div className="text-3xl font-bold mb-2 text-yellow-500">
                Winner!
              </div>
              <div className="text-2xl font-bold mb-4">
                {winnerName || "Unknown Player"}
              </div>
              <div className="flex justify-center gap-2 text-4xl mb-4">
                <span className="animate-pulse">🎉</span>
                <span
                  className="animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                >
                  🎊
                </span>
                <span
                  className="animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                >
                  ✨
                </span>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Final song: {result.song.name} ({result.song.year})
              </div>
            </>
          ) : (
            // Normal turn result
            <>
              <div className="text-6xl mb-4">
                {result.activePlayerCorrect ? "✅" : wasStolen ? "🎯" : "❌"}
              </div>
              <div className="text-2xl font-bold mb-2">
                {result.activePlayerCorrect
                  ? "Correct!"
                  : wasStolen
                    ? `Stolen by ${result.stolenBy?.playerName}!`
                    : "Incorrect!"}
              </div>
              {songLost && (
                <div className="text-sm text-muted-foreground mb-2">
                  Song discarded - no one got it right
                </div>
              )}
              <div className="text-lg font-medium">{result.song.name}</div>
              <div className="text-muted-foreground">{result.song.artist}</div>
              <div className="text-2xl font-bold text-primary mt-2">
                {result.song.year}
              </div>
              {/* Show guess result if a guess was made */}
              {(result.guessedName || result.guessedArtist) && (
                <div
                  className={`mt-4 p-3 rounded-lg ${result.guessWasCorrect ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}
                >
                  <div className="text-sm font-medium mb-1">
                    {result.guessWasCorrect
                      ? "🎯 Correct guess! +1 token"
                      : "❌ Wrong guess"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Your guess: {result.guessedName || "—"} by{" "}
                    {result.guessedArtist || "—"}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const pin = (params.pin as string).toUpperCase();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: authSession } = useSession();
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(true);
  const [turnResult, setTurnResult] = useState<{
    activePlayerCorrect: boolean;
    song: { name: string; artist: string; year: number };
    stolenBy?: { playerId: string; playerName: string } | null;
    recipientId?: string | null;
    gameEnded?: boolean;
    winnerId?: string;
    isNewRound?: boolean;
    newRoundNumber?: number;
    guessWasCorrect?: boolean;
    guessedName?: string | null;
    guessedArtist?: string | null;
  } | null>(null);
  const [showRoundShuffleAnimation, setShowRoundShuffleAnimation] =
    useState(false);

  const trpc = useTRPC();

  const sessionQuery = useQuery({
    ...trpc.game.getSession.queryOptions({ pin }),
    refetchInterval: 1000, // Faster polling during steal phase
  });

  const confirmTurnMutation = useMutation({
    ...trpc.game.confirmTurn.mutationOptions(),
    onSuccess: () => {
      // Steal phase started - just invalidate query
      queryClient.invalidateQueries({
        queryKey: trpc.game.getSession.queryKey({ pin }),
      });
    },
  });

  const submitStealMutation = useMutation({
    ...trpc.game.submitSteal.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.game.getSession.queryKey({ pin }),
      });
    },
  });

  const resolveStealPhaseMutation = useMutation({
    ...trpc.game.resolveStealPhase.mutationOptions(),
    onSuccess: (data) => {
      setTurnResult({
        activePlayerCorrect: data.activePlayerCorrect,
        song: data.song,
        stolenBy: data.stolenBy,
        recipientId: data.recipientId,
        gameEnded: data.gameEnded,
        winnerId: "winnerId" in data ? data.winnerId : undefined,
        isNewRound: "isNewRound" in data ? data.isNewRound : undefined,
        newRoundNumber:
          "newRoundNumber" in data ? data.newRoundNumber : undefined,
        guessWasCorrect: data.guessWasCorrect,
        guessedName: data.guessedName,
        guessedArtist: data.guessedArtist,
      });
      queryClient.invalidateQueries({
        queryKey: trpc.game.getSession.queryKey({ pin }),
      });
    },
  });

  const skipSongMutation = useMutation({
    ...trpc.game.skipSong.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.game.getSession.queryKey({ pin }),
      });
    },
  });

  const getFreeSongMutation = useMutation({
    ...trpc.game.getFreeSong.mutationOptions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trpc.game.getSession.queryKey({ pin }),
      });
      if (data.gameEnded && "winnerId" in data) {
        setTurnResult({
          activePlayerCorrect: true,
          song: data.freeSong,
          gameEnded: true,
          winnerId: data.winnerId,
        });
      }
    },
  });

  const startRematchMutation = useMutation({
    ...trpc.game.startRematch.mutationOptions(),
    onSuccess: () => {
      router.push(`/lobby/${pin}`);
    },
  });

  // Get current player ID from localStorage
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  useEffect(() => {
    const storedPlayerId = localStorage.getItem("hitster_player_id");
    setCurrentPlayerId(storedPlayerId);
  }, []);

  // Hide shuffle animation after 2 seconds
  useEffect(() => {
    if (showShuffleAnimation) {
      const timer = setTimeout(() => setShowShuffleAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showShuffleAnimation]);

  // Hide round shuffle animation after 2.5 seconds
  useEffect(() => {
    if (showRoundShuffleAnimation) {
      const timer = setTimeout(() => setShowRoundShuffleAnimation(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showRoundShuffleAnimation]);

  // Redirect back to lobby if game is not playing
  useEffect(() => {
    if (sessionQuery.data?.state === "lobby") {
      router.push(`/lobby/${pin}`);
    }
  }, [sessionQuery.data?.state, router, pin]);

  const handleConfirmTurn = useCallback(
    (placementIndex: number, guessedName?: string, guessedArtist?: string) => {
      if (!currentPlayerId) return;
      confirmTurnMutation.mutate({
        pin,
        playerId: currentPlayerId,
        placementIndex,
        guessedName,
        guessedArtist,
      });
    },
    [confirmTurnMutation, pin, currentPlayerId],
  );

  const handleSubmitSteal = useCallback(
    (placementIndex: number) => {
      if (!currentPlayerId) return;
      submitStealMutation.mutate({
        pin,
        playerId: currentPlayerId,
        placementIndex,
      });
    },
    [submitStealMutation, pin, currentPlayerId],
  );

  const handleResolveStealPhase = useCallback(() => {
    if (resolveStealPhaseMutation.isPending) return;
    resolveStealPhaseMutation.mutate({ pin });
  }, [resolveStealPhaseMutation, pin]);

  const handleCloseResult = useCallback(() => {
    // Check if new round started - show shuffle animation
    if (turnResult?.isNewRound && !turnResult?.gameEnded) {
      setShowRoundShuffleAnimation(true);
    }
    setTurnResult(null);
  }, [turnResult?.isNewRound, turnResult?.gameEnded]);

  const handleTimeUp = useCallback(() => {
    // Called when timer expires - turn already auto-submitted via TimelineDropZone
  }, []);

  const handleSkipSong = useCallback(() => {
    if (!currentPlayerId || skipSongMutation.isPending) return;
    skipSongMutation.mutate({
      pin,
      playerId: currentPlayerId,
    });
  }, [skipSongMutation, pin, currentPlayerId]);

  const handleGetFreeSong = useCallback(() => {
    if (!currentPlayerId || getFreeSongMutation.isPending) return;
    getFreeSongMutation.mutate({
      pin,
      playerId: currentPlayerId,
    });
  }, [getFreeSongMutation, pin, currentPlayerId]);

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

  const isHost = authSession?.user?.id === session?.hostId;

  if (session?.state === "finished") {
    const sortedPlayers = [...session.players].sort(
      (a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0),
    );
    const winner = sortedPlayers[0];

    // Party stats
    const totalGamesPlayed = session.gamesPlayed ?? 1;
    const sortedByWins = [...session.players].sort(
      (a, b) => (b.wins ?? 0) - (a.wins ?? 0),
    );
    const partyMVP = sortedByWins[0];
    const hasPartyStats = session.players.some((p) => (p.wins ?? 0) > 0);

    const handleRematch = () => {
      startRematchMutation.mutate({ pin });
    };

    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {/* Winner celebration header */}
            <div className="flex justify-center gap-2 text-3xl mb-2">
              <span className="animate-bounce">🎉</span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.1s" }}
              >
                🏆
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "0.2s" }}
              >
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
              <h3 className="font-semibold mb-3 text-center">
                Final Standings
              </h3>
              <div className="space-y-3">
                {sortedPlayers.map((player, idx) => {
                  const stats = session.playerStats?.[player.id];
                  const accuracy =
                    stats && stats.totalPlacements > 0
                      ? Math.round(
                          (stats.correctPlacements / stats.totalPlacements) *
                            100,
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
                        <div className="text-xs text-muted-foreground">
                          songs
                        </div>
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

            {/* Rematch button for host */}
            {isHost && (
              <div>
                <Button
                  onClick={handleRematch}
                  disabled={startRematchMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {startRematchMutation.isPending
                    ? "Starting..."
                    : "🔄 Play Again"}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  New players can join via PIN: {session.pin}
                </p>
              </div>
            )}

            {!isHost && (
              <div className="text-center text-sm text-muted-foreground">
                Waiting for host to start a rematch...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMyTurn = currentPlayerId === session?.currentPlayerId;
  const currentPlayer = session?.players.find(
    (p) => p.id === session.currentPlayerId,
  );
  const myPlayer = session?.players.find((p) => p.id === currentPlayerId);
  const isStealPhase = session?.isStealPhase ?? false;
  const hasAlreadyStolen = (session?.stealAttempts ?? []).some(
    (a) => a.playerId === currentPlayerId,
  );

  return (
    <div className="min-h-screen p-4">
      {turnResult && (
        <TurnResultOverlay
          result={turnResult}
          onClose={handleCloseResult}
          winnerName={
            turnResult.winnerId
              ? session?.players.find((p) => p.id === turnResult.winnerId)?.name
              : undefined
          }
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Game Header */}
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Hitster</CardTitle>
            <CardDescription>
              PIN: {session?.pin} | Round {session?.roundNumber}
              {isStealPhase && (
                <span className="ml-2 text-amber-500 font-medium">
                  🎯 STEAL PHASE
                </span>
              )}
            </CardDescription>
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

        {/* Spotify Player - Host Only (continues during steal phase) */}
        {isHost && session?.state === "playing" && (
          <SpotifyPlayer
            isHost={isHost}
            trackUri={session?.currentSong?.uri ?? null}
            shouldPlay={
              !showShuffleAnimation &&
              !showRoundShuffleAnimation &&
              !!session?.currentSong
            }
            durationMs={(session?.songPlayDuration ?? 30) * 1000}
            onPlaybackError={(error) => {
              console.error("Spotify playback error:", error);
            }}
          />
        )}

        {/* Initial Shuffle Animation Overlay */}
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

        {/* New Round Shuffle Animation */}
        {showRoundShuffleAnimation && !showShuffleAnimation && (
          <Card className="border-2 border-dashed border-amber-500/50 bg-amber-500/5">
            <CardContent className="py-8 text-center">
              <div className="text-4xl mb-4 animate-spin">🔀</div>
              <div className="text-lg font-medium">New Round!</div>
              <div className="text-xl font-bold text-amber-500 mt-2">
                Round {session?.roundNumber}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Shuffling turn order...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Host Display - Shows active player's timeline prominently */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          isHost &&
          currentPlayer &&
          !isMyTurn && (
            <ActivePlayerTimeline
              player={currentPlayer}
              currentSong={isStealPhase ? null : (session?.currentSong ?? null)}
              turnStartedAt={
                isStealPhase ? null : (session?.turnStartedAt ?? null)
              }
              turnDuration={session?.turnDuration ?? 45}
            />
          )}

        {/* Steal Phase */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          isStealPhase &&
          session?.currentSong &&
          session?.stealPhaseEndAt &&
          currentPlayer &&
          myPlayer && (
            <StealPhase
              currentSong={session.currentSong}
              myTimeline={myPlayer.timeline ?? []}
              activePlayerName={currentPlayer.name}
              activePlayerPlacement={session.activePlayerPlacement ?? 0}
              stealAttempts={session.stealAttempts ?? []}
              stealPhaseEndAt={session.stealPhaseEndAt}
              myTokens={myPlayer.tokens}
              isActivePlayer={isMyTurn}
              hasAlreadyStolen={hasAlreadyStolen}
              onSubmitSteal={handleSubmitSteal}
              onResolve={handleResolveStealPhase}
              isSubmitting={submitStealMutation.isPending}
            />
          )}

        {/* My Turn - Active Player View (only when NOT in steal phase) */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          !isStealPhase &&
          isMyTurn &&
          session?.currentSong &&
          myPlayer && (
            <Card className="border-2 border-primary">
              <CardHeader className="text-center">
                <CardTitle className="text-green-500">Your Turn!</CardTitle>
                <CardDescription>
                  Place the mystery song in your timeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimelineDropZone
                  timeline={myPlayer.timeline ?? []}
                  currentSong={session.currentSong}
                  onConfirm={handleConfirmTurn}
                  onTimeUp={handleTimeUp}
                  onSkip={handleSkipSong}
                  onGetFreeSong={handleGetFreeSong}
                  isSubmitting={confirmTurnMutation.isPending}
                  isSkipping={skipSongMutation.isPending}
                  isGettingFreeSong={getFreeSongMutation.isPending}
                  turnDuration={session.turnDuration}
                  turnStartedAt={session.turnStartedAt}
                  tokens={myPlayer.tokens}
                />
              </CardContent>
            </Card>
          )}

        {/* Waiting View - Not My Turn (only when NOT in steal phase) */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          !isStealPhase &&
          !isMyTurn &&
          currentPlayer && (
            <Card className="bg-muted/50">
              <CardContent className="py-6">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl">{currentPlayer.avatar}</span>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      Current Turn
                    </div>
                    <div className="text-xl font-bold">
                      {currentPlayer.name}
                    </div>
                  </div>
                </div>
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  Waiting for {currentPlayer.name} to place their song...
                </div>
              </CardContent>
            </Card>
          )}

        {/* My Timeline (when not my turn and not in steal phase) */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          !isStealPhase &&
          !isMyTurn &&
          myPlayer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <TimelineDisplay timeline={myPlayer.timeline ?? []} />
                <div className="mt-2 text-sm text-muted-foreground">
                  {myPlayer.timeline?.length ?? 0} / {session?.songsToWin} songs
                </div>
              </CardContent>
            </Card>
          )}

        {/* Players List */}
        {!showShuffleAnimation && !showRoundShuffleAnimation && (
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
