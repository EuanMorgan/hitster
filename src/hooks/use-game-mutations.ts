import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useTRPC } from "@/trpc/client";

interface UseGameMutationsOptions {
  pin: string;
}

export function useGameMutations({ pin }: UseGameMutationsOptions) {
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

  const resolveStealPhase = useMutation({
    ...trpc.game.resolveStealPhase.mutationOptions(),
    onSuccess: invalidateSession,
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

  const decideToSteal = useMutation({
    ...trpc.game.decideToSteal.mutationOptions(),
    onSuccess: (data) => {
      invalidateSession();
      if (data.allDecided) {
        transitionToPlacePhase.mutate({ pin });
      }
    },
  });

  const skipSteal = useMutation({
    ...trpc.game.skipSteal.mutationOptions(),
    onSuccess: (data) => {
      invalidateSession();
      if (data.allDecided) {
        if (data.allSkipped) {
          resolveStealPhase.mutate({ pin });
        } else {
          transitionToPlacePhase.mutate({ pin });
        }
      }
    },
  });

  const submitSteal = useMutation({
    ...trpc.game.submitSteal.mutationOptions(),
    onSuccess: (data) => {
      invalidateSession();
      if (data.allPlaced) {
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
    onSuccess: invalidateSession,
  });

  const buyExtraTime = useMutation({
    ...trpc.game.buyExtraTime.mutationOptions(),
    onSuccess: invalidateSession,
  });

  const startRematch = useMutation({
    ...trpc.game.startRematch.mutationOptions(),
    onSuccess: () => {
      router.push(`/lobby/${pin}`);
    },
  });

  const endGame = useMutation({
    ...trpc.game.endGame.mutationOptions(),
    onSuccess: invalidateSession,
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
    buyExtraTime,
    startRematch,
    endGame,
  };
}
