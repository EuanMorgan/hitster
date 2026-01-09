"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

export function CreateGameButton() {
  const router = useRouter();
  const { data: session } = useSession();
  const trpc = useTRPC();

  const createGameMutation = useMutation(
    trpc.game.createGame.mutationOptions({
      onSuccess: (data) => {
        localStorage.setItem("hitster_player_id", data.playerId);
        localStorage.setItem("hitster_session_id", data.sessionId);
        localStorage.setItem("hitster_game_pin", data.pin);
        router.push(`/lobby/${data.pin}`);
      },
    }),
  );

  if (!session?.user) {
    return (
      <Button variant="secondary" className="flex-1" disabled>
        Create Game
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      className="flex-1"
      onClick={() => createGameMutation.mutate()}
      disabled={createGameMutation.isPending}
    >
      {createGameMutation.isPending ? "Creating..." : "Create Game"}
    </Button>
  );
}
