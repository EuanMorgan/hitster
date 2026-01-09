import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlayerState {
  playerId: string | null;
  sessionId: string | null;
  gamePin: string | null;
}

interface PlayerActions {
  setPlayer: (data: {
    playerId: string;
    sessionId: string;
    gamePin: string;
  }) => void;
  clearPlayer: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

const initialState: PlayerState = {
  playerId: null,
  sessionId: null,
  gamePin: null,
};

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      ...initialState,
      setPlayer: (data) =>
        set({
          playerId: data.playerId,
          sessionId: data.sessionId,
          gamePin: data.gamePin,
        }),
      clearPlayer: () => set(initialState),
    }),
    {
      name: "hitster-player",
      skipHydration: true,
    },
  ),
);

// Hook for manual hydration in useEffect (SSR safety)
export function usePlayerStoreHydration() {
  const hydrated = usePlayerStore.persist.hasHydrated();

  if (!hydrated) {
    usePlayerStore.persist.rehydrate();
  }

  return hydrated;
}
