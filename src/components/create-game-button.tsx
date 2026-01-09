"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { usePlayerStore } from "@/stores/player-store";
import { useTRPC } from "@/trpc/client";

export function CreateGameButton() {
  const router = useRouter();
  const { data: session } = useSession();
  const trpc = useTRPC();
  const setPlayer = usePlayerStore((state) => state.setPlayer);

  const createGameMutation = useMutation(
    trpc.game.createGame.mutationOptions({
      onSuccess: (data) => {
        setPlayer({
          playerId: data.playerId,
          sessionId: data.sessionId,
          gamePin: data.pin,
        });
        router.push(`/lobby/${data.pin}`);
      },
    }),
  );

  if (!session?.user) {
    return (
      <Button variant="secondary" size="lg" className="flex-1" disabled>
        Create Game
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      className="flex-1"
      onClick={() => createGameMutation.mutate()}
      disabled={createGameMutation.isPending}
    >
      {createGameMutation.isPending ? "Creating..." : "Create Game"}
    </Button>
  );
}
