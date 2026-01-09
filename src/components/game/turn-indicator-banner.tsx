interface TurnIndicatorBannerProps {
  isMyTurn: boolean;
  currentPlayerName: string;
  currentPlayerAvatar: string;
  phase: "placing" | "steal" | "results" | "waiting";
}

export function TurnIndicatorBanner({
  isMyTurn,
  currentPlayerName,
  currentPlayerAvatar,
  phase,
}: TurnIndicatorBannerProps) {
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
