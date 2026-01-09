import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { TurnResult } from "@/components/game/turn-result-overlay";
import { useTRPC } from "@/trpc/client";

interface UseGameMutationsOptions {
  pin: string;
  onTurnResult?: (result: TurnResult) => void;
}

export function useGameMutations({
  pin,
  onTurnResult,
}: UseGameMutationsOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const invalidateSession = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: trpc.game.getSession.queryKey({ pin }),
    });
  }, [queryClient, trpc.game.getSession, pin]);

  const confirmTurn = useMutation({
    ...trpc.game.confirmTurn.mutationOptions(),
    onSuccess: invalidateSession,
  });

  const submitSteal = useMutation({
    ...trpc.game.submitSteal.mutationOptions(),
    onSuccess: invalidateSession,
  });

  const decideToSteal = useMutation({
    ...trpc.game.decideToSteal.mutationOptions(),
    onSuccess: invalidateSession,
  });

  const resolveStealPhase = useMutation({
    ...trpc.game.resolveStealPhase.mutationOptions(),
    onSuccess: (data) => {
      onTurnResult?.({
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
      invalidateSession();
    },
  });

  const skipSteal = useMutation({
    ...trpc.game.skipSteal.mutationOptions(),
    onSuccess: (data) => {
      invalidateSession();
      if (data.allSkipped) {
        resolveStealPhase.mutate({ pin });
      }
    },
  });

  const transitionToPlacePhase = useMutation({
    ...trpc.game.transitionToPlacePhase.mutationOptions(),
    onSuccess: (data) => {
      invalidateSession();
      if (data.skippedToResolve) {
        resolveStealPhase.mutate({ pin });
      }
    },
  });

  const skipSong = useMutation({
    ...trpc.game.skipSong.mutationOptions(),
    onSuccess: invalidateSession,
  });

  const getFreeSong = useMutation({
    ...trpc.game.getFreeSong.mutationOptions(),
    onSuccess: (data) => {
      invalidateSession();
      if (data.gameEnded && "winnerId" in data) {
        onTurnResult?.({
          activePlayerCorrect: true,
          song: data.freeSong,
          gameEnded: true,
          winnerId: data.winnerId,
        });
      }
    },
  });

  const startRematch = useMutation({
    ...trpc.game.startRematch.mutationOptions(),
    onSuccess: () => {
      router.push(`/lobby/${pin}`);
    },
  });

  return {
    confirmTurn,
    submitSteal,
    decideToSteal,
    skipSteal,
    transitionToPlacePhase,
    resolveStealPhase,
    skipSong,
    getFreeSong,
    startRematch,
  };
}
