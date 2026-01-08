"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TimelineSong } from "@/db/schema";
import { TimelineDropZone } from "@/components/timeline-drop-zone";
import { StealPhase } from "@/components/steal-phase";

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

function TurnResultOverlay({
  result,
  onClose,
}: {
  result: {
    activePlayerCorrect: boolean;
    song: { name: string; artist: string; year: number };
    stolenBy?: { playerId: string; playerName: string } | null;
    recipientId?: string | null;
    gameEnded?: boolean;
    winnerId?: string;
  };
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const wasStolen = !!result.stolenBy;
  const songLost = !result.activePlayerCorrect && !wasStolen;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 animate-in zoom-in-95">
        <CardContent className="py-8 text-center">
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
          {result.gameEnded && (
            <div className="mt-4 text-xl font-bold text-green-500">
              Game Over!
            </div>
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
  } | null>(null);
  const [showRoundShuffleAnimation, setShowRoundShuffleAnimation] = useState(false);

  const trpc = useTRPC();

  const sessionQuery = useQuery({
    ...trpc.game.getSession.queryOptions({ pin }),
    refetchInterval: 1000, // Faster polling during steal phase
  });

  const confirmTurnMutation = useMutation({
    ...trpc.game.confirmTurn.mutationOptions(),
    onSuccess: () => {
      // Steal phase started - just invalidate query
      queryClient.invalidateQueries({ queryKey: trpc.game.getSession.queryKey({ pin }) });
    },
  });

  const submitStealMutation = useMutation({
    ...trpc.game.submitSteal.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.game.getSession.queryKey({ pin }) });
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
        newRoundNumber: "newRoundNumber" in data ? data.newRoundNumber : undefined,
      });
      queryClient.invalidateQueries({ queryKey: trpc.game.getSession.queryKey({ pin }) });
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
    (placementIndex: number) => {
      if (!currentPlayerId) return;
      confirmTurnMutation.mutate({
        pin,
        playerId: currentPlayerId,
        placementIndex,
      });
    },
    [confirmTurnMutation, pin, currentPlayerId]
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
    [submitStealMutation, pin, currentPlayerId]
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
            <CardTitle>Game Finished!</CardTitle>
            <CardDescription>Thanks for playing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {session.players
                .sort(
                  (a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0)
                )
                .map((player, idx) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      idx === 0 ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-muted"
                    }`}
                  >
                    <span className="text-2xl">
                      {idx === 0 ? "🏆" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : ""}
                    </span>
                    <span className="text-2xl">{player.avatar}</span>
                    <span className="font-medium">{player.name}</span>
                    <span className="ml-auto text-muted-foreground">
                      {player.timeline?.length ?? 0} songs
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMyTurn = currentPlayerId === session?.currentPlayerId;
  const currentPlayer = session?.players.find(
    (p) => p.id === session.currentPlayerId
  );
  const myPlayer = session?.players.find((p) => p.id === currentPlayerId);
  const isStealPhase = session?.isStealPhase ?? false;
  const hasAlreadyStolen = (session?.stealAttempts ?? []).some(
    (a) => a.playerId === currentPlayerId
  );

  return (
    <div className="min-h-screen p-4">
      {turnResult && (
        <TurnResultOverlay result={turnResult} onClose={handleCloseResult} />
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
                  isSubmitting={confirmTurnMutation.isPending}
                  turnDuration={session.turnDuration}
                  turnStartedAt={session.turnStartedAt}
                />
              </CardContent>
            </Card>
          )}

        {/* Waiting View - Not My Turn (only when NOT in steal phase) */}
        {!showShuffleAnimation && !showRoundShuffleAnimation && !isStealPhase && !isMyTurn && currentPlayer && (
          <Card className="bg-muted/50">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{currentPlayer.avatar}</span>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    Current Turn
                  </div>
                  <div className="text-xl font-bold">{currentPlayer.name}</div>
                </div>
              </div>
              <div className="text-center mt-4 text-sm text-muted-foreground">
                Waiting for {currentPlayer.name} to place their song...
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Timeline (when not my turn and not in steal phase) */}
        {!showShuffleAnimation && !showRoundShuffleAnimation && !isStealPhase && !isMyTurn && myPlayer && (
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
