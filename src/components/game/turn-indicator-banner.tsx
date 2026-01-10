import { useCountdownTimer } from "@/hooks/use-countdown-timer";

interface TurnIndicatorBannerProps {
  isMyTurn: boolean;
  currentPlayerName: string;
  currentPlayerAvatar: string;
  phase: "placing" | "steal" | "results" | "waiting";
  turnStartedAt?: string | null;
  turnDuration?: number;
  bonusTimeSeconds?: number;
}

export function TurnIndicatorBanner({
  isMyTurn,
  currentPlayerName,
  currentPlayerAvatar,
  phase,
  turnStartedAt,
  turnDuration = 45,
  bonusTimeSeconds = 0,
}: TurnIndicatorBannerProps) {
  const phaseLabels = {
    placing: "Placing song",
    steal: "Steal Phase",
    results: "Results",
    waiting: "Starting...",
  };

  // Calculate end time for spectator timer
  const effectiveDuration = turnDuration + bonusTimeSeconds;
  const endTime = turnStartedAt
    ? new Date(
        new Date(turnStartedAt).getTime() + effectiveDuration * 1000,
      ).toISOString()
    : null;

  const { timeLeft, colorClass } = useCountdownTimer({
    endTime: endTime ?? "",
    duration: effectiveDuration,
    onTimeUp: () => {},
  });

  const showTimer = !isMyTurn && phase === "placing" && turnStartedAt;

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
        {showTimer && (
          <div
            className={`text-2xl sm:text-3xl font-mono font-bold ${colorClass} ml-2`}
          >
            {timeLeft}s
          </div>
        )}
      </div>
    </div>
  );
}
