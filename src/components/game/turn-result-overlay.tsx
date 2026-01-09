"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

export interface TurnResult {
  activePlayerCorrect: boolean;
  song: { name: string; artist: string; year: number };
  stolenBy?: { playerId: string; playerName: string } | null;
  recipientId?: string | null;
  gameEnded?: boolean;
  winnerId?: string;
  isNewRound?: boolean;
  newRoundNumber?: number;
  guessWasCorrect?: boolean;
  nameCorrect?: boolean;
  artistCorrect?: boolean;
  guessedName?: string | null;
  guessedArtist?: string | null;
}

interface TurnResultOverlayProps {
  result: TurnResult;
  onClose: () => void;
  winnerName?: string;
}

export function TurnResultOverlay({
  result,
  onClose,
  winnerName,
}: TurnResultOverlayProps) {
  useEffect(() => {
    // Longer timeout if game ended to enjoy celebration, 5s for normal results
    const timer = setTimeout(onClose, result.gameEnded ? 6000 : 5000);
    return () => clearTimeout(timer);
  }, [onClose, result.gameEnded]);

  const wasStolen = !!result.stolenBy;
  const songLost = !result.activePlayerCorrect && !wasStolen;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 animate-in zoom-in-95">
        <CardContent className="py-8 text-center">
          {result.gameEnded ? (
            // Winner celebration
            <>
              <div className="text-6xl mb-4 animate-bounce">🏆</div>
              <div className="text-3xl font-bold mb-2 text-yellow-500">
                Winner!
              </div>
              <div className="text-2xl font-bold mb-4">
                {winnerName || "Unknown Player"}
              </div>
              <div className="flex justify-center gap-2 text-4xl mb-4">
                <span className="animate-pulse">🎉</span>
                <span
                  className="animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                >
                  🎊
                </span>
                <span
                  className="animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                >
                  ✨
                </span>
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                Final song: {result.song.name} ({result.song.year})
              </div>
            </>
          ) : (
            // Normal turn result
            <>
              <div className="text-6xl mb-4">
                {result.activePlayerCorrect ? "✅" : wasStolen ? "🎯" : "❌"}
              </div>
              <div className="text-2xl font-bold mb-2">
                {result.activePlayerCorrect
                  ? "Correct!"
                  : wasStolen
                    ? `Stolen by ${result.stolenBy?.playerName}!`
                    : "Incorrect!"}
              </div>
              {songLost && (
                <div className="text-sm text-muted-foreground mb-2">
                  Song discarded - no one got it right
                </div>
              )}
              <div className="text-lg font-medium">{result.song.name}</div>
              <div className="text-muted-foreground">{result.song.artist}</div>
              <div className="text-2xl font-bold text-primary mt-2">
                {result.song.year}
              </div>
              {/* Show guess result if a guess was made */}
              {(result.guessedName || result.guessedArtist) && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-left">
                  {/* Title with token bonus animation */}
                  <div className="text-base font-medium mb-3 text-center">
                    {result.guessWasCorrect ? (
                      <span className="inline-flex items-center gap-2">
                        🎯 Correct guess!
                        <span className="inline-block animate-[scale_0.3s_ease-out] text-lg">
                          +1 🪙
                        </span>
                      </span>
                    ) : (
                      "Your Guess"
                    )}
                  </div>
                  {/* Name comparison */}
                  {result.guessedName && (
                    <div className="mb-2">
                      <div
                        className={`text-base px-2 py-1 rounded ${
                          result.nameCorrect
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-red-500/20 text-red-700 dark:text-red-400"
                        }`}
                      >
                        Your guess: {result.guessedName}
                      </div>
                      {!result.nameCorrect && (
                        <div className="text-base text-muted-foreground mt-1 px-2">
                          Actual: {result.song.name}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Artist comparison */}
                  {result.guessedArtist && (
                    <div>
                      <div
                        className={`text-base px-2 py-1 rounded ${
                          result.artistCorrect
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-red-500/20 text-red-700 dark:text-red-400"
                        }`}
                      >
                        Your guess: {result.guessedArtist}
                      </div>
                      {!result.artistCorrect && (
                        <div className="text-base text-muted-foreground mt-1 px-2">
                          Actual: {result.song.artist}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
