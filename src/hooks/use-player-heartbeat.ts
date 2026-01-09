"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTRPC } from "@/trpc/client";

const HEARTBEAT_INTERVAL_MS = 3000;

export function usePlayerHeartbeat(playerId: string | null) {
  const trpc = useTRPC();
  const heartbeatMutation = useMutation({
    ...trpc.game.heartbeat.mutationOptions(),
  });

  const mutateRef = useRef(heartbeatMutation.mutate);
  mutateRef.current = heartbeatMutation.mutate;

  useEffect(() => {
    if (!playerId) return;

    const sendHeartbeat = () => mutateRef.current({ playerId });
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [playerId]);
}
