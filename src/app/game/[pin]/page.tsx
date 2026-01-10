"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActivePlayerTimeline } from "@/components/game/active-player-timeline";
import { GameFinishedScreen } from "@/components/game/game-finished-screen";
import { GameHeader } from "@/components/game/game-header";
import { GameSkeleton } from "@/components/game/game-skeleton";
import { HostDisconnectedOverlay } from "@/components/game/host-disconnected-overlay";
import { MyTimelineCard } from "@/components/game/my-timeline-card";
import { MyTurnCard } from "@/components/game/my-turn-card";
import { PlayerProgressBar } from "@/components/game/player-progress-bar";
import { TurnIndicatorBanner } from "@/components/game/turn-indicator-banner";
import {
  type TurnResult,
  TurnResultOverlay,
} from "@/components/game/turn-result-overlay";
import { StealDecidePhase } from "@/components/steal-decide-phase";
import { StealPhase } from "@/components/steal-phase";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGameMutations } from "@/hooks/use-game-mutations";
import { useGameSession } from "@/hooks/use-game-session";
import { useGameState } from "@/hooks/use-game-state";
import { usePlayerHeartbeat } from "@/hooks/use-player-heartbeat";
import { usePlayerValidation } from "@/hooks/use-player-validation";
import { useSpotifyPlayer } from "@/hooks/use-spotify-player";
import { useSession } from "@/lib/auth-client";

export default function GamePage() {
  const params = useParams();
  const pin = (params.pin as string).toUpperCase();
  const router = useRouter();
  const { data: authSession } = useSession();
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);
  const prevBonusTimeRef = useRef(0);
  const [playbackStartedAt, setPlaybackStartedAt] = useState<number | null>(
    null,
  );

  const sessionQuery = useGameSession({ pin });
  const mutations = useGameMutations({ pin });

  // Show turn result from session when it changes
  // Use sessionStorage to persist shown results across refresh
  const lastTurnResult = sessionQuery.data?.lastTurnResult;
  useEffect(() => {
    if (!lastTurnResult) return;

    const storageKey = `turnResult:${pin}:${lastTurnResult.displayedAt}`;
    if (sessionStorage.getItem(storageKey)) return;

    sessionStorage.setItem(storageKey, "true");
    setTurnResult(lastTurnResult);
  }, [lastTurnResult, pin]);

  const { playerId: currentPlayerId } = usePlayerValidation({
    pin,
    sessionData: sessionQuery.data,
    isSessionLoading: sessionQuery.isLoading,
    requirePlayer: false,
  });

  usePlayerHeartbeat(currentPlayerId);

  const gameState = useGameState({
    session: sessionQuery.data,
    currentPlayerId,
    authUserId: authSession?.user?.id,
  });

  useEffect(() => {
    if (sessionQuery.data?.state === "lobby") {
      router.push(`/lobby/${pin}`);
    }
  }, [sessionQuery.data?.state, router, pin]);

  const currentTrackUri = sessionQuery.data?.currentSong?.uri;
  const turnStartedAt = sessionQuery.data?.turnStartedAt;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset playbackStartedAt when track or turn changes
  useEffect(() => {
    setPlaybackStartedAt(null);
  }, [currentTrackUri, turnStartedAt]);

  const bonusTime = sessionQuery.data?.bonusTimeSeconds ?? 0;
  useEffect(() => {
    if (
      prevBonusTimeRef.current === 0 &&
      bonusTime > 0 &&
      !gameState.isMyTurn
    ) {
      toast.info(`🪙 ${gameState.currentPlayer?.name ?? "Player"} bought +20s`);
    }
    prevBonusTimeRef.current = bonusTime;
  }, [bonusTime, gameState.isMyTurn, gameState.currentPlayer]);

  // Spotify player for host
  const spotify = useSpotifyPlayer({
    enabled: gameState.isHost && sessionQuery.data?.state === "playing",
    trackUri: sessionQuery.data?.currentSong?.uri ?? null,
    shouldPlay: !!sessionQuery.data?.currentSong,
    onPlaybackStarted: () => setPlaybackStartedAt(Date.now()),
    onError: (error) => console.error("Spotify playback error:", error),
  });

  const handleConfirmTurn = useCallback(
    (placementIndex: number, guessedName?: string, guessedArtist?: string) => {
      if (!currentPlayerId) return;
      mutations.confirmTurn.mutate({
        pin,
        playerId: currentPlayerId,
        placementIndex,
        guessedName,
        guessedArtist,
      });
    },
    [mutations.confirmTurn, pin, currentPlayerId],
  );

  const handleSubmitSteal = useCallback(
    (placementIndex: number) => {
      if (!currentPlayerId) return;
      mutations.submitSteal.mutate({
        pin,
        playerId: currentPlayerId,
        placementIndex,
      });
    },
    [mutations.submitSteal, pin, currentPlayerId],
  );

  const handleResolveStealPhase = useCallback(() => {
    if (mutations.resolveStealPhase.isPending) return;
    mutations.resolveStealPhase.mutate({ pin });
  }, [mutations.resolveStealPhase, pin]);

  const handleDecideToSteal = useCallback(() => {
    if (!currentPlayerId || mutations.decideToSteal.isPending) return;
    mutations.decideToSteal.mutate({ pin, playerId: currentPlayerId });
  }, [mutations.decideToSteal, pin, currentPlayerId]);

  const handleSkipSteal = useCallback(() => {
    if (!currentPlayerId || mutations.skipSteal.isPending) return;
    mutations.skipSteal.mutate({ pin, playerId: currentPlayerId });
  }, [mutations.skipSteal, pin, currentPlayerId]);

  const handleDecidePhaseTimeUp = useCallback(() => {
    if (mutations.transitionToPlacePhase.isPending) return;
    mutations.transitionToPlacePhase.mutate({ pin });
  }, [mutations.transitionToPlacePhase, pin]);

  const handleCloseResult = useCallback(() => {
    setTurnResult(null);
  }, []);

  const handleTimeUp = useCallback(() => {}, []);

  const handleSkipSong = useCallback(() => {
    if (!currentPlayerId || mutations.skipSong.isPending) return;
    mutations.skipSong.mutate({ pin, playerId: currentPlayerId });
  }, [mutations.skipSong, pin, currentPlayerId]);

  const handleGetFreeSong = useCallback(() => {
    if (!currentPlayerId || mutations.getFreeSong.isPending) return;
    mutations.getFreeSong.mutate({ pin, playerId: currentPlayerId });
  }, [mutations.getFreeSong, pin, currentPlayerId]);

  const handleBuyExtraTime = useCallback(() => {
    if (!currentPlayerId || mutations.buyExtraTime.isPending) return;
    mutations.buyExtraTime.mutate({ pin, playerId: currentPlayerId });
  }, [mutations.buyExtraTime, pin, currentPlayerId]);

  if (sessionQuery.isLoading) return <GameSkeleton />;

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
        onRematch={() => mutations.startRematch.mutate({ pin })}
        isRematchPending={mutations.startRematch.isPending}
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

      {hostDisconnected && !isHost && <HostDisconnectedOverlay />}

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <GameHeader
          pin={session?.pin ?? pin}
          roundNumber={session?.roundNumber ?? 1}
          songsToWin={session?.songsToWin ?? 10}
          turnDuration={session?.turnDuration ?? 45}
          isStealPhase={isStealPhase}
          yearLookupStatus={session?.yearLookupStatus}
          yearLookupProgress={session?.yearLookupProgress}
          yearLookupTotal={session?.yearLookupTotal}
          isHost={isHost}
          onEndGame={() => mutations.endGame.mutate({ pin })}
          isEndingGame={mutations.endGame.isPending}
          spotify={isHost ? spotify : undefined}
        />

        {/* Show "Your Turn!" banner only when it's your turn */}
        {currentPlayer && session?.state === "playing" && isMyTurn && (
          <TurnIndicatorBanner
            isMyTurn={isMyTurn}
            currentPlayerName={currentPlayer.name}
            currentPlayerAvatar={currentPlayer.avatar}
            phase={turnResult ? "results" : isStealPhase ? "steal" : "placing"}
            turnStartedAt={session?.turnStartedAt}
            turnDuration={session?.turnDuration ?? 45}
            bonusTimeSeconds={session?.bonusTimeSeconds ?? 0}
          />
        )}

        {/* Show active player's timeline for spectators during placing phase */}
        {!isStealPhase && !isMyTurn && currentPlayer && (
          <ActivePlayerTimeline
            player={currentPlayer}
            currentSong={session?.currentSong ?? null}
            turnStartedAt={session?.turnStartedAt ?? null}
            turnDuration={session?.turnDuration ?? 45}
            bonusTimeSeconds={session?.bonusTimeSeconds ?? 0}
          />
        )}

        {/* Show spectator's own timeline when not their turn */}
        {!isMyTurn && myPlayer?.timeline && myPlayer.timeline.length > 0 && (
          <MyTimelineCard timeline={myPlayer.timeline} />
        )}

        {isDecidePhase &&
          session?.stealDecidePhaseEndAt &&
          currentPlayer &&
          myPlayer && (
            <StealDecidePhase
              activePlayerName={currentPlayer.name}
              activePlayerTimeline={currentPlayer.timeline ?? []}
              activePlayerPlacement={session.activePlayerPlacement ?? null}
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
              isDeciding={mutations.decideToSteal.isPending}
              isSkipping={mutations.skipSteal.isPending}
            />
          )}

        {isPlacePhase &&
          session?.currentSong &&
          session?.stealPlacePhaseEndAt &&
          currentPlayer &&
          myPlayer && (
            <StealPhase
              activePlayerTimeline={currentPlayer.timeline ?? []}
              activePlayerPlacement={session.activePlayerPlacement ?? null}
              activePlayerName={currentPlayer.name}
              stealAttempts={session.stealAttempts ?? []}
              stealPhaseEndAt={session.stealPlacePhaseEndAt}
              stealWindowDuration={(session.stealWindowDuration ?? 10) * 2}
              isActivePlayer={isMyTurn}
              hasAlreadyStolen={hasAlreadyStolen}
              onSubmitSteal={handleSubmitSteal}
              onResolve={handleResolveStealPhase}
              isSubmitting={mutations.submitSteal.isPending}
              decidedStealers={decidedStealers}
              canStealAsLateJoiner={
                !isMyTurn && !hasDecided && myPlayer.tokens >= 1
              }
              currentPlayerId={currentPlayerId ?? undefined}
            />
          )}

        {!isStealPhase && isMyTurn && session?.currentSong && myPlayer && (
          <MyTurnCard
            timeline={myPlayer.timeline ?? []}
            currentSong={session.currentSong}
            onConfirm={handleConfirmTurn}
            onTimeUp={handleTimeUp}
            onSkip={handleSkipSong}
            onGetFreeSong={handleGetFreeSong}
            onBuyTime={handleBuyExtraTime}
            isSubmitting={mutations.confirmTurn.isPending}
            isSkipping={mutations.skipSong.isPending}
            isGettingFreeSong={mutations.getFreeSong.isPending}
            isBuyingTime={mutations.buyExtraTime.isPending}
            turnDuration={session.turnDuration}
            turnStartedAt={session.turnStartedAt}
            playbackStartedAt={playbackStartedAt}
            bonusTimeSeconds={session.bonusTimeSeconds ?? 0}
            tokens={myPlayer.tokens}
            timerPaused={hostDisconnected}
          />
        )}

        {/* Player scores at bottom */}
        {session?.state === "playing" && (
          <PlayerProgressBar
            players={session?.players ?? []}
            currentPlayerId={session?.currentPlayerId ?? null}
            songsToWin={session?.songsToWin ?? 10}
          />
        )}
      </div>
    </div>
  );
}
