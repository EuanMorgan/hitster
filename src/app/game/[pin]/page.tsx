"use client";

import { Confetti } from "@neoconfetti/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SpotifyPlayer } from "@/components/spotify-player";
import { StealDecidePhase } from "@/components/steal-decide-phase";
import { StealPhase } from "@/components/steal-phase";
import { ThemeToggle } from "@/components/theme-toggle";
import { TimelineDropZone } from "@/components/timeline-drop-zone";
import { TurnShuffleAnimation } from "@/components/turn-shuffle-animation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SafeCurrentTurnSong, TimelineSong } from "@/db/schema";
import { useGameSession } from "@/hooks/use-game-session";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

function GameSkeleton() {
  return (
    <div className="min-h-screen p-4 animate-in fade-in-0 duration-200">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header skeleton */}
        <Card>
          <CardHeader className="text-center pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="w-9" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <Skeleton className="h-4 w-32 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex justify-center gap-4 sm:gap-8">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>

        {/* Current turn skeleton */}
        <Card className="bg-muted/50">
          <CardContent className="py-4 sm:py-6 px-3 sm:px-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
              <div className="text-center space-y-2">
                <Skeleton className="h-3 w-20 mx-auto" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
            <Skeleton className="h-4 w-40 mx-auto mt-4" />
          </CardContent>
        </Card>

        {/* Players section skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-20" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg p-3 sm:p-4 bg-muted">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  {[1, 2].map((j) => (
                    <Skeleton
                      key={j}
                      className="h-14 w-16 sm:h-16 sm:w-20 rounded-lg"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const sortedTimeline = [...timeline].sort((a, b) => a.year - b.year);

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

function PlayerProgressBar({
  players,
  currentPlayerId,
  songsToWin,
}: {
  players: {
    id: string;
    name: string;
    avatar: string;
    timeline: TimelineSong[] | null;
  }[];
  currentPlayerId: string | null;
  songsToWin: number;
}) {
  // Sort by timeline length descending
  const sortedPlayers = [...players].sort(
    (a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0),
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-3 bg-muted/50 rounded-lg">
      {sortedPlayers.map((player) => {
        const songCount = player.timeline?.length ?? 0;
        const progress = (songCount / songsToWin) * 100;
        const isPlaying = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
              isPlaying ? "bg-primary/20 ring-2 ring-primary" : "bg-background"
            }`}
          >
            <span className="text-2xl">{player.avatar}</span>
            <div className="flex flex-col min-w-[60px]">
              <span className="text-sm font-medium truncate max-w-[80px]">
                {player.name}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-primary">
                  {songCount}/{songsToWin}
                </span>
              </div>
            </div>
          </div>
        );
      })}
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
  currentSong: SafeCurrentTurnSong | null;
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

  // Timer color based on time remaining
  const timerPercentage =
    timeRemaining !== null ? (timeRemaining / turnDuration) * 100 : 100;
  const timerColorClass =
    timerPercentage <= 25
      ? "text-red-500"
      : timerPercentage <= 50
        ? "text-amber-500"
        : "text-green-500";
  const barColorClass =
    timerPercentage <= 25
      ? "bg-red-500"
      : timerPercentage <= 50
        ? "bg-amber-500"
        : "bg-green-500";
  // Pulse at 1Hz during last 5 seconds
  const shouldPulse =
    timeRemaining !== null && timeRemaining <= 5 && timeRemaining > 0;

  return (
    <Card className="border-2 border-primary bg-primary/5 relative">
      {/* Timer in top-right corner - min 48px per PRD */}
      {timeRemaining !== null && (
        <div className="absolute top-4 right-4 flex flex-col items-center">
          <div
            className={`text-5xl md:text-6xl font-mono tabular-nums font-bold ${timerColorClass} ${
              shouldPulse ? "animate-[pulse_1s_ease-in-out_infinite]" : ""
            }`}
            style={{ minWidth: "80px", textAlign: "center" }}
          >
            {timeRemaining}s
          </div>
          {/* Progress bar */}
          <div className="w-20 h-2 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${barColorClass}`}
              style={{ width: `${timerPercentage}%` }}
            />
          </div>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center gap-4 pr-28">
          <span className="text-6xl">{player.avatar}</span>
          <div>
            <CardTitle className="text-3xl md:text-4xl">
              {player.name}&apos;s Turn
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-base">
              <span>
                <TokenDisplay count={player.tokens} />
              </span>
              <span>{player.timeline?.length ?? 0} songs in timeline</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current song indicator (placeholder - year hidden) */}
        {currentSong && (
          <div className="mb-6 p-6 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-center border-2 border-dashed border-amber-400">
            <div className="text-lg text-muted-foreground mb-2">
              Mystery Song Playing
            </div>
            <div className="text-5xl">🎵❓🎵</div>
            <div className="text-sm text-muted-foreground mt-2">
              Waiting for placement...
            </div>
          </div>
        )}

        {/* Timeline display - large cards optimized for TV viewing */}
        <div className="space-y-3">
          <h4 className="text-lg font-medium text-muted-foreground">
            Timeline ({sortedTimeline.length} songs)
          </h4>
          {sortedTimeline.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center border-2 border-dashed rounded-xl">
              <span className="text-3xl">🎵</span>
              <span className="text-lg">
                No songs yet — your musical journey starts here!
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {sortedTimeline.map((song) => (
                <div
                  key={song.songId}
                  className="bg-card border-2 border-primary/30 rounded-xl px-5 py-4 text-center min-w-[140px] shadow-md"
                >
                  {/* Year: min 24px for TV readability at 2m */}
                  <div className="font-bold text-3xl md:text-4xl text-primary">
                    {song.year}
                  </div>
                  <div className="text-base font-medium truncate max-w-[160px]">
                    {song.name}
                  </div>
                  <div className="text-sm text-muted-foreground truncate max-w-[160px]">
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
    nameCorrect?: boolean;
    artistCorrect?: boolean;
    guessedName?: string | null;
    guessedArtist?: string | null;
  };
  onClose: () => void;
  winnerName?: string;
}) {
  useEffect(() => {
    // Longer timeout if game ended to enjoy celebration, 5s for normal results
    const timer = setTimeout(onClose, result.gameEnded ? 6000 : 5000);
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
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-left">
                  {/* Title with token bonus animation */}
                  <div className="text-base font-medium mb-3 text-center">
                    {result.guessWasCorrect ? (
                      <span className="inline-flex items-center gap-2">
                        🎯 Correct guess!
                        <span className="inline-block animate-[scale_0.3s_ease-out] text-lg">
                          +1 🪙
                        </span>
                      </span>
                    ) : (
                      "Your Guess"
                    )}
                  </div>
                  {/* Name comparison */}
                  {result.guessedName && (
                    <div className="mb-2">
                      <div
                        className={`text-base px-2 py-1 rounded ${
                          result.nameCorrect
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-red-500/20 text-red-700 dark:text-red-400"
                        }`}
                      >
                        Your guess: {result.guessedName}
                      </div>
                      {!result.nameCorrect && (
                        <div className="text-base text-muted-foreground mt-1 px-2">
                          Actual: {result.song.name}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Artist comparison */}
                  {result.guessedArtist && (
                    <div>
                      <div
                        className={`text-base px-2 py-1 rounded ${
                          result.artistCorrect
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-red-500/20 text-red-700 dark:text-red-400"
                        }`}
                      >
                        Your guess: {result.guessedArtist}
                      </div>
                      {!result.artistCorrect && (
                        <div className="text-base text-muted-foreground mt-1 px-2">
                          Actual: {result.song.artist}
                        </div>
                      )}
                    </div>
                  )}
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
    nameCorrect?: boolean;
    artistCorrect?: boolean;
    guessedName?: string | null;
    guessedArtist?: string | null;
  } | null>(null);
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

  // Get current player ID from localStorage and validate it belongs to this game
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [playerValidated, setPlayerValidated] = useState(false);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem("hitster_player_id");
    const storedPin = localStorage.getItem("hitster_game_pin");

    // If stored PIN matches current game, use stored player ID
    if (storedPlayerId && storedPin === pin) {
      setCurrentPlayerId(storedPlayerId);
      setPlayerValidated(true);
    } else if (storedPlayerId && !storedPin) {
      // Legacy: no PIN stored, assume player is valid (backward compatibility)
      setCurrentPlayerId(storedPlayerId);
      setPlayerValidated(true);
    } else {
      // No player ID or wrong game - will validate against session data
      setCurrentPlayerId(storedPlayerId);
      setPlayerValidated(false);
    }
  }, [pin]);

  // Heartbeat to track player presence
  const heartbeatMutation = useMutation({
    ...trpc.game.heartbeat.mutationOptions(),
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: mutate is stable
  useEffect(() => {
    if (!currentPlayerId) return;
    const sendHeartbeat = () =>
      heartbeatMutation.mutate({ playerId: currentPlayerId });
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [currentPlayerId]);

  // Validate player belongs to this game session
  useEffect(() => {
    if (!sessionQuery.data || playerValidated) return;

    const playerInSession = sessionQuery.data.players.find(
      (p) => p.id === currentPlayerId,
    );

    if (playerInSession) {
      // Player found in session - update localStorage with correct PIN and mark validated
      localStorage.setItem("hitster_game_pin", pin);
      setPlayerValidated(true);
    } else if (currentPlayerId) {
      // Player ID exists but not in this session - redirect to join
      router.push(`/join?pin=${pin}`);
    }
    // If no player ID at all, let them watch as spectator (handled by UI)
  }, [sessionQuery.data, currentPlayerId, playerValidated, pin, router]);

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
            stageWidth={window.innerWidth}
            stageHeight={window.innerHeight}
          />
        </div>
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

            {/* Action buttons */}
            <div className="space-y-3">
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

              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/">🏠 Back to Home</Link>
              </Button>
            </div>
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

  // Two-phase steal system
  const stealPhase = session?.stealPhase ?? null;
  const isDecidePhase = stealPhase === "decide";
  const isPlacePhase = stealPhase === "place";
  const isStealPhase = stealPhase !== null;
  const decidedStealers = session?.decidedStealers ?? [];
  const playerSkips = session?.playerSkips ?? [];
  const hasDecided =
    decidedStealers.includes(currentPlayerId ?? "") ||
    playerSkips.includes(currentPlayerId ?? "");
  const hasAlreadyStolen = (session?.stealAttempts ?? []).some(
    (a) => a.playerId === currentPlayerId,
  );
  // Total eligible = all non-active players
  const totalEligible =
    (session?.players.length ?? 0) - 1 > 0
      ? (session?.players.length ?? 0) - 1
      : 0;
  const decidedCount = decidedStealers.length + playerSkips.length;

  // Check if host is disconnected during gameplay
  const hostDisconnected =
    session?.state === "playing" && session?.hostIsConnected === false;

  return (
    <div className="min-h-screen p-4 overflow-x-hidden">
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

        {/* My Timeline (when not my turn and not in steal phase) */}
        {!showShuffleAnimation &&
          !showRoundShuffleAnimation &&
          !isStealPhase &&
          !isMyTurn &&
          myPlayer && (
            <Card>
              <CardHeader className="py-3 sm:py-4 px-3 sm:px-6">
                <CardTitle className="text-base sm:text-lg">
                  Your Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <TimelineDisplay timeline={myPlayer.timeline ?? []} />
                <div className="mt-2 text-xs sm:text-sm text-muted-foreground">
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
