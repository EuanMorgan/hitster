"use client";

import { useEffect } from "react";
import { usePlayerStore } from "@/stores/player-store";

export function PlayerStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    usePlayerStore.persist.rehydrate();
  }, []);

  return <>{children}</>;
}
