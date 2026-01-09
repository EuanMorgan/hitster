"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActivePlayerTimeline } from "@/components/game/active-player-timeline";
import { GameFinishedScreen } from "@/components/game/game-finished-screen";
import { GameHeader } from "@/components/game/game-header";
import { GameSkeleton } from "@/components/game/game-skeleton";
import { HostDisconnectedOverlay } from "@/components/game/host-disconnected-overlay";
import { MyTurnCard } from "@/components/game/my-turn-card";
import { PlayerCard } from "@/components/game/player-card";
import { PlayerProgressBar } from "@/components/game/player-progress-bar";
import { TurnIndicatorBanner } from "@/components/game/turn-indicator-banner";
import {
  type TurnResult,
  TurnResultOverlay,
} from "@/components/game/turn-result-overlay";
import { WaitingView } from "@/components/game/waiting-view";
import { SpotifyPlayer } from "@/components/spotify-player";
import { StealDecidePhase } from "@/components/steal-decide-phase";
import { StealPhase } from "@/components/steal-phase";
import { TurnShuffleAnimation } from "@/components/turn-shuffle-animation";
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
import { useSession } from "@/lib/auth-client";
import { getPlayersSortedWithCurrentFirst } from "@/lib/game-selectors";

export default function GamePage() {
  const params = useParams();
  const pin = (params.pin as string).toUpperCase();
  const router = useRouter();
  const { data: authSession } = useSession();
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(true);
  const [turnResult, setTurnResult] = useState<TurnResult | null>(null);
  const [showRoundShuffleAnimation, setShowRoundShuffleAnimation] =
    useState(false);
  const [playbackStartedAt, setPlaybackStartedAt] = useState<number | null>(
    null,
  );

  const sessionQuery = useGameSession({ pin });
  const mutations = useGameMutations({ pin, onTurnResult: setTurnResult });

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on track change
  useEffect(() => {
    setPlaybackStartedAt(null);
  }, [currentTrackUri]);

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
    if (turnResult?.isNewRound && !turnResult?.gameEnded) {
      setShowRoundShuffleAnimation(true);
    }
    setTurnResult(null);
  }, [turnResult?.isNewRound, turnResult?.gameEnded]);

  const handleTimeUp = useCallback(() => {}, []);

  const handleSkipSong = useCallback(() => {
    if (!currentPlayerId || mutations.skipSong.isPending) return;
    mutations.skipSong.mutate({ pin, playerId: currentPlayerId });
  }, [mutations.skipSong, pin, currentPlayerId]);

  const handleGetFreeSong = useCallback(() => {
    if (!currentPlayerId || mutations.getFreeSong.isPending) return;
    mutations.getFreeSong.mutate({ pin, playerId: currentPlayerId });
  }, [mutations.getFreeSong, pin, currentPlayerId]);

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

  const showAnimations = showShuffleAnimation || showRoundShuffleAnimation;

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

      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <GameHeader
          pin={session?.pin ?? pin}
          roundNumber={session?.roundNumber ?? 1}
          songsToWin={session?.songsToWin ?? 10}
          turnDuration={session?.turnDuration ?? 45}
          isStealPhase={isStealPhase}
        />

        {isHost && session?.state === "playing" && (
          <SpotifyPlayer
            isHost={isHost}
            trackUri={session?.currentSong?.uri ?? null}
            shouldPlay={!showAnimations && !!session?.currentSong}
            onPlaybackStarted={() => setPlaybackStartedAt(Date.now())}
            onPlaybackError={(error) =>
              console.error("Spotify playback error:", error)
            }
          />
        )}

        {!showAnimations && currentPlayer && session?.state === "playing" && (
          <TurnIndicatorBanner
            isMyTurn={isMyTurn}
            currentPlayerName={currentPlayer.name}
            currentPlayerAvatar={currentPlayer.avatar}
            phase={turnResult ? "results" : isStealPhase ? "steal" : "placing"}
          />
        )}

        {showShuffleAnimation && session?.turnOrder && (
          <TurnShuffleAnimation
            players={session.players ?? []}
            turnOrder={session.turnOrder}
            onComplete={() => setShowShuffleAnimation(false)}
          />
        )}

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

        {!showAnimations && isHost && currentPlayer && !isMyTurn && (
          <>
            <ActivePlayerTimeline
              player={currentPlayer}
              currentSong={isStealPhase ? null : (session?.currentSong ?? null)}
              turnStartedAt={
                isStealPhase ? null : (session?.turnStartedAt ?? null)
              }
              turnDuration={session?.turnDuration ?? 45}
            />
            <PlayerProgressBar
              players={session?.players ?? []}
              currentPlayerId={session?.currentPlayerId ?? null}
              songsToWin={session?.songsToWin ?? 10}
            />
          </>
        )}

        {!showAnimations &&
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
              isDeciding={mutations.decideToSteal.isPending}
              isSkipping={mutations.skipSteal.isPending}
            />
          )}

        {!showAnimations &&
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
              isSubmitting={mutations.submitSteal.isPending}
              decidedStealers={decidedStealers}
              canStealAsLateJoiner={
                !isMyTurn && !hasDecided && myPlayer.tokens >= 1
              }
              currentPlayerId={currentPlayerId ?? undefined}
            />
          )}

        {!showAnimations &&
          !isStealPhase &&
          isMyTurn &&
          session?.currentSong &&
          myPlayer && (
            <MyTurnCard
              timeline={myPlayer.timeline ?? []}
              currentSong={session.currentSong}
              onConfirm={handleConfirmTurn}
              onTimeUp={handleTimeUp}
              onSkip={handleSkipSong}
              onGetFreeSong={handleGetFreeSong}
              isSubmitting={mutations.confirmTurn.isPending}
              isSkipping={mutations.skipSong.isPending}
              isGettingFreeSong={mutations.getFreeSong.isPending}
              turnDuration={session.turnDuration}
              turnStartedAt={session.turnStartedAt}
              playbackStartedAt={playbackStartedAt}
              tokens={myPlayer.tokens}
              timerPaused={hostDisconnected}
            />
          )}

        {!showAnimations && !isStealPhase && !isMyTurn && currentPlayer && (
          <WaitingView
            playerName={currentPlayer.name}
            playerAvatar={currentPlayer.avatar}
          />
        )}

        {!showAnimations && (
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
