"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActivePlayerTimeline } from "@/components/game/active-player-timeline";
import { GameFinishedScreen } from "@/components/game/game-finished-screen";
import { GameSkeleton } from "@/components/game/game-skeleton";
import { PlayerProgressBar } from "@/components/game/player-progress-bar";
import {
  type TurnResult,
  TurnResultOverlay,
} from "@/components/game/turn-result-overlay";
import { SpotifyPlayer } from "@/components/spotify-player";
import { StealDecidePhase } from "@/components/steal-decide-phase";
import { StealPhase } from "@/components/steal-phase";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimelineDropZone } from "@/components/timeline-drop-zone";
import { TurnShuffleAnimation } from "@/components/turn-shuffle-animation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TimelineSong } from "@/db/schema";
import { useGameSession } from "@/hooks/use-game-session";
import { useGameState } from "@/hooks/use-game-state";
import { usePlayerHeartbeat } from "@/hooks/use-player-heartbeat";
import { usePlayerValidation } from "@/hooks/use-player-validation";
import { useSession } from "@/lib/auth-client";
import {
  getPlayersSortedWithCurrentFirst,
  getTimelineSortedByYear,
} from "@/lib/game-selectors";
import { useTRPC } from "@/trpc/client";

function TokenDisplay({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground text-sm">No tokens</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-yellow-500">🪙</span>
      <span className="text-sm font-medium">
        <span className="hidden sm:inline">x</span>
        {count}
      </span>
    </div>
  );
}

function TimelineDisplay({ timeline }: { timeline: TimelineSong[] }) {
  if (timeline.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <span>🎵</span>
        <span>No songs yet — your musical journey starts here!</span>
      </div>
    );
  }

  const sortedTimeline = getTimelineSortedByYear(timeline);

  return (
    <div className="overflow-x-auto scroll-smooth">
      <div className="flex gap-2 sm:gap-3 min-w-min pb-2 snap-x snap-mandatory">
        {sortedTimeline.map((song) => (
          <div
            key={song.songId}
            className="bg-gradient-to-br from-card to-muted/50 border-2 border-green-500/30 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-center min-w-[100px] sm:min-w-[120px] shrink-0 snap-start"
          >
            <div className="font-bold text-xl sm:text-2xl text-primary">
              {song.year}
            </div>
            <div className="text-sm text-foreground line-clamp-2 max-w-[95px] sm:max-w-[115px]">
              {song.name}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[95px] sm:max-w-[115px]">
              {song.artist}
            </div>
          </div>
        ))}
      </div>
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
    isConnected: boolean;
  };
  isCurrentTurn: boolean;
  turnNumber: number;
}) {
  const isLowTokens = player.tokens < 2;

  return (
    <div
      className={`rounded-lg p-3 sm:p-4 transition-all relative overflow-hidden ${
        isCurrentTurn
          ? "bg-primary/10 border-l-4 border-l-primary shadow-[0_0_15px_rgba(var(--primary-rgb,59,130,246),0.15)]"
          : "bg-muted border-l-4 border-l-transparent"
      } ${!player.isConnected ? "opacity-60" : ""}`}
    >
      {!player.isConnected && (
        <div className="absolute inset-0 bg-gray-500/30 rounded-lg flex items-center justify-center backdrop-blur-[1px]">
          <span className="text-[10px] sm:text-xs bg-gray-700 text-white px-2 py-1 rounded font-medium flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Reconnecting...
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span
            className={`text-[48px] sm:text-[56px] leading-none shrink-0 ${!player.isConnected ? "grayscale" : ""}`}
          >
            {player.avatar}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-[180px]">
                {player.name}
              </span>
              {player.isHost && (
                <span className="text-[10px] sm:text-xs bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 rounded shrink-0">
                  Host
                </span>
              )}
              {isCurrentTurn && player.isConnected && (
                <span className="text-[10px] sm:text-xs bg-green-500 text-white px-1.5 sm:px-2 py-0.5 rounded animate-pulse shrink-0">
                  Playing
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Turn #{turnNumber}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div
            className={isLowTokens ? "text-amber-500" : "text-muted-foreground"}
          >
            <TokenDisplay count={player.tokens} />
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1">
            {player.timeline?.length ?? 0} song
            {(player.timeline?.length ?? 0) !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <TimelineDisplay timeline={player.timeline ?? []} />
    </div>
  );
}

function TurnIndicatorBanner({
  isMyTurn,
  currentPlayerName,
  currentPlayerAvatar,
  phase,
}: {
  isMyTurn: boolean;
  currentPlayerName: string;
  currentPlayerAvatar: string;
  phase: "placing" | "steal" | "results" | "waiting";
}) {
  const phaseLabels = {
    placing: "Placing song",
    steal: "Steal Phase",
    results: "Results",
    waiting: "Starting...",
  };

  return (
    <div
      className={`rounded-lg p-3 sm:p-4 text-center transition-all ${
        isMyTurn
          ? "bg-primary text-primary-foreground border-2 border-primary animate-[pulse_2s_ease-in-out_infinite]"
          : "bg-muted/80 border border-border"
      }`}
    >
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <span className="text-2xl sm:text-3xl">{currentPlayerAvatar}</span>
        <div>
          <div
            className={`text-lg sm:text-xl font-bold ${isMyTurn ? "" : "text-foreground"}`}
          >
            {isMyTurn ? "Your Turn!" : `${currentPlayerName}'s Turn`}
          </div>
          <div
            className={`text-xs sm:text-sm ${isMyTurn ? "text-primary-foreground/80" : "text-muted-foreground"}`}
          >
            {phaseLabels[phase]}
          </div>
        </div>
      </div>
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
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);
  const [showRoundShuffleAnimation, setShowRoundShuffleAnimation] =
    useState(false);
  const [playbackStartedAt, setPlaybackStartedAt] = useState<number | null>(
    null,
  );

  const trpc = useTRPC();

  const sessionQuery = useGameSession({ pin });

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

  const decideToStealMutation = useMutation({
    ...trpc.game.decideToSteal.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.game.getSession.queryKey({ pin }),
      });
    },
  });

  const skipStealMutation = useMutation({
    ...trpc.game.skipSteal.mutationOptions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trpc.game.getSession.queryKey({ pin }),
      });
      // If all players skipped, immediately resolve
      if (data.allSkipped) {
        resolveStealPhaseMutation.mutate({ pin });
      }
    },
  });

  const transitionToPlacePhaseMutation = useMutation({
    ...trpc.game.transitionToPlacePhase.mutationOptions(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trpc.game.getSession.queryKey({ pin }),
      });
      // If no one decided to steal, immediately resolve
      if (data.skippedToResolve) {
        resolveStealPhaseMutation.mutate({ pin });
      }
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

  const { playerId: currentPlayerId } = usePlayerValidation({
    pin,
    sessionData: sessionQuery.data,
    isSessionLoading: sessionQuery.isLoading,
    requirePlayer: false, // allow spectator mode in game
  });

  usePlayerHeartbeat(currentPlayerId);

  const gameState = useGameState({
    session: sessionQuery.data,
    currentPlayerId,
    authUserId: authSession?.user?.id,
  });

  // Redirect back to lobby if game is not playing
  useEffect(() => {
    if (sessionQuery.data?.state === "lobby") {
      router.push(`/lobby/${pin}`);
    }
  }, [sessionQuery.data?.state, router, pin]);

  // Reset playbackStartedAt when track changes (new turn)
  const currentTrackUri = sessionQuery.data?.currentSong?.uri;
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on track change
  useEffect(() => {
    setPlaybackStartedAt(null);
  }, [currentTrackUri]);

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

  const handleDecideToSteal = useCallback(() => {
    if (!currentPlayerId || decideToStealMutation.isPending) return;
    decideToStealMutation.mutate({ pin, playerId: currentPlayerId });
  }, [decideToStealMutation, pin, currentPlayerId]);

  const handleSkipSteal = useCallback(() => {
    if (!currentPlayerId || skipStealMutation.isPending) return;
    skipStealMutation.mutate({ pin, playerId: currentPlayerId });
  }, [skipStealMutation, pin, currentPlayerId]);

  const handleDecidePhaseTimeUp = useCallback(() => {
    // Transition from decide phase to place phase (or resolve if no stealers)
    if (transitionToPlacePhaseMutation.isPending) return;
    transitionToPlacePhaseMutation.mutate({ pin });
  }, [transitionToPlacePhaseMutation, pin]);

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
    return <GameSkeleton />;
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

  // Destructure computed game state
  const {
    currentPlayer,
    myPlayer,
    isHost,
    isMyTurn,
    isDecidePhase,
    isPlacePhase,
    isStealPhase,
    decidedStealers,
    hasDecided,
    hasAlreadyStolen,
    totalEligible,
    decidedCount,
    hostDisconnected,
  } = gameState;

  if (session?.state === "finished") {
    return (
      <GameFinishedScreen
        players={session.players}
        playerStats={session.playerStats}
        gamesPlayed={session.gamesPlayed ?? 1}
        pin={session.pin}
        isHost={isHost}
        onRematch={() => startRematchMutation.mutate({ pin })}
        isRematchPending={startRematchMutation.isPending}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 overflow-x-hidden animate-in fade-in duration-150">
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

      {/* Host Disconnected Overlay */}
      {hostDisconnected && !isHost && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="py-8 text-center">
              <div className="text-5xl mb-4 animate-pulse">📡</div>
              <div className="text-xl font-bold mb-2">Waiting for host...</div>
              <div className="text-muted-foreground text-sm">
                The host has disconnected. Game will resume when they reconnect.
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-amber-500">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" />
                <div
                  className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Game Header - compact on mobile */}
        <Card>
          <CardHeader className="text-center pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="w-9" />
              <CardTitle className="text-xl sm:text-2xl">Hitster</CardTitle>
              <ThemeToggle />
            </div>
            <CardDescription className="text-xs sm:text-sm">
              PIN: {session?.pin} • Round {session?.roundNumber}
              {isStealPhase && (
                <span className="ml-1 sm:ml-2 text-amber-500 font-medium">
                  🎯 STEAL
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex justify-center gap-4 sm:gap-8 text-xs sm:text-sm">
              <div>
                <span className="text-muted-foreground">Goal:</span>{" "}
                <span className="font-medium">{session?.songsToWin}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Time:</span>{" "}
                <span className="font-medium">{session?.turnDuration}s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spotify Player - Host Only (plays continuously through turn + steal phases) */}
        {isHost && session?.state === "playing" && (
          <SpotifyPlayer
            isHost={isHost}
            trackUri={session?.currentSong?.uri ?? null}
            shouldPlay={
              !showShuffleAnimation &&
              !showRoundShuffleAnimation &&
              !!session?.currentSong
            }
            onPlaybackStarted={() => setPlaybackStartedAt(Date.now())}
            onPlaybackError={(error) => {
              console.error("Spotify playback error:", error);
            }}
          />
        )}

        {/* Mobile Turn Indicator Banner - prominent, always visible during gameplay */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          currentPlayer &&
          session?.state === "playing" && (
            <TurnIndicatorBanner
              isMyTurn={isMyTurn}
              currentPlayerName={currentPlayer.name}
              currentPlayerAvatar={currentPlayer.avatar}
              phase={
                turnResult ? "results" : isStealPhase ? "steal" : "placing"
              }
            />
          )}

        {/* Initial Shuffle Animation Overlay */}
        {showShuffleAnimation && session?.turnOrder && (
          <TurnShuffleAnimation
            players={session.players ?? []}
            turnOrder={session.turnOrder}
            onComplete={() => setShowShuffleAnimation(false)}
          />
        )}

        {/* New Round Shuffle Animation */}
        {showRoundShuffleAnimation &&
          !showShuffleAnimation &&
          session?.turnOrder && (
            <TurnShuffleAnimation
              players={session.players ?? []}
              turnOrder={session.turnOrder}
              roundNumber={session.roundNumber}
              onComplete={() => setShowRoundShuffleAnimation(false)}
            />
          )}

        {/* Host Display - Shows active player's timeline prominently */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          isHost &&
          currentPlayer &&
          !isMyTurn && (
            <>
              <ActivePlayerTimeline
                player={currentPlayer}
                currentSong={
                  isStealPhase ? null : (session?.currentSong ?? null)
                }
                turnStartedAt={
                  isStealPhase ? null : (session?.turnStartedAt ?? null)
                }
                turnDuration={session?.turnDuration ?? 45}
              />
              {/* Player progress indicators for host TV display */}
              <PlayerProgressBar
                players={session?.players ?? []}
                currentPlayerId={session?.currentPlayerId ?? null}
                songsToWin={session?.songsToWin ?? 10}
              />
            </>
          )}

        {/* Steal Decide Phase - Players choose Steal or Skip */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          isDecidePhase &&
          session?.stealDecidePhaseEndAt &&
          currentPlayer &&
          myPlayer && (
            <StealDecidePhase
              activePlayerName={currentPlayer.name}
              stealDecidePhaseEndAt={session.stealDecidePhaseEndAt}
              stealWindowDuration={session.stealWindowDuration ?? 10}
              myTokens={myPlayer.tokens}
              isActivePlayer={isMyTurn}
              hasDecided={hasDecided}
              decidedCount={decidedCount}
              totalEligible={totalEligible}
              onDecideSteal={handleDecideToSteal}
              onSkipSteal={handleSkipSteal}
              onTimeUp={handleDecidePhaseTimeUp}
              isDeciding={decideToStealMutation.isPending}
              isSkipping={skipStealMutation.isPending}
            />
          )}

        {/* Steal Place Phase - Stealers place their guesses */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          isPlacePhase &&
          session?.currentSong &&
          session?.stealPlacePhaseEndAt &&
          currentPlayer &&
          myPlayer && (
            <StealPhase
              currentSong={session.currentSong}
              myTimeline={myPlayer.timeline ?? []}
              activePlayerName={currentPlayer.name}
              activePlayerPlacement={session.activePlayerPlacement ?? 0}
              stealAttempts={session.stealAttempts ?? []}
              stealPhaseEndAt={session.stealPlacePhaseEndAt}
              stealWindowDuration={(session.stealWindowDuration ?? 10) * 2}
              myTokens={myPlayer.tokens}
              isActivePlayer={isMyTurn}
              hasAlreadyStolen={hasAlreadyStolen}
              onSubmitSteal={handleSubmitSteal}
              onResolve={handleResolveStealPhase}
              isSubmitting={submitStealMutation.isPending}
              decidedStealers={decidedStealers}
              canStealAsLateJoiner={
                !isMyTurn && !hasDecided && myPlayer.tokens >= 1
              }
              currentPlayerId={currentPlayerId ?? undefined}
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
              <CardHeader className="text-center py-3 sm:py-4 px-3 sm:px-6">
                <CardTitle className="text-green-500 text-lg sm:text-xl">
                  Your Turn!
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Place the mystery song in your timeline
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6 pb-4">
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
                  playbackStartedAt={playbackStartedAt}
                  tokens={myPlayer.tokens}
                  timerPaused={hostDisconnected}
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
              <CardContent className="py-4 sm:py-6 px-3 sm:px-6">
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <span className="text-2xl sm:text-3xl">
                    {currentPlayer.avatar}
                  </span>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Current Turn
                    </div>
                    <div className="text-lg sm:text-xl font-bold">
                      {currentPlayer.name}
                    </div>
                  </div>
                </div>
                <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                  Waiting for {currentPlayer.name} to place...
                </div>
              </CardContent>
            </Card>
          )}

        {/* Players List - current user always first */}
        {!showShuffleAnimation && !showRoundShuffleAnimation && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Players</h2>
            <div className="grid gap-4">
              {getPlayersSortedWithCurrentFirst(
                session?.players ?? [],
                currentPlayerId ?? null,
              ).map((player, index) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentTurn={player.id === session?.currentPlayerId}
                  turnNumber={
                    session?.turnOrder?.indexOf(player.id) !== undefined
                      ? (session?.turnOrder?.indexOf(player.id) ?? 0) + 1
                      : index + 1
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
