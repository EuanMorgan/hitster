"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";

interface UseGameSessionOptions {
  pin: string;
  enabled?: boolean;
}

export function useGameSession({ pin, enabled = true }: UseGameSessionOptions) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const toastShownRef = useRef(false);

  // Subscribe to session updates via SSE
  const subscription = useSubscription(
    trpc.game.onSessionUpdate.subscriptionOptions(
      { pin },
      {
        enabled,
        onStarted: () => {
          setConnectionError(null);
          toastShownRef.current = false;
        },
        onData: (data) => {
          if (data.type === "update") {
            // Refetch session data when we get an update notification
            queryClient.invalidateQueries({
              queryKey: trpc.game.getSession.queryKey({ pin }),
            });
          }
          // "connected" and "ping" types are just for connection management
        },
        onError: (err) => {
          console.error("Subscription error:", err);
          setConnectionError("Connection lost");

          // Only show toast once per error cycle
          if (!toastShownRef.current) {
            toastShownRef.current = true;
            toast.error("Real-time connection failed", {
              description: "Using slower polling for updates. Click to retry.",
              action: {
                label: "Retry",
                onClick: () => {
                  subscription.reset();
                },
              },
              duration: 10000,
            });
          }
        },
      }
    )
  );

  const isSubscribed = subscription.status === "pending";

  // Query for session data
  const sessionQuery = useQuery({
    ...trpc.game.getSession.queryOptions({ pin }),
    enabled,
    // Only use polling as fallback when subscription is not connected
    refetchInterval: isSubscribed ? false : 2000,
  });

  // Manual retry function for connection errors
  const retryConnection = useCallback(() => {
    setConnectionError(null);
    subscription.reset();
  }, [subscription]);

  return {
    ...sessionQuery,
    isSubscribed,
    connectionError,
    retryConnection,
  };
}
