"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";

type MatchType = "exact" | "fuzzy" | false;

export interface TurnResult {
  activePlayerCorrect: boolean;
  song: { name: string; displayName?: string; artist: string; year: number };
  stolenBy?: { playerId: string; playerName: string } | null;
  recipientId?: string | null;
  gameEnded?: boolean;
  winnerId?: string;
  isNewRound?: boolean;
  newRoundNumber?: number;
  guessWasCorrect?: boolean;
  nameCorrect?: boolean;
  artistCorrect?: boolean;
  nameMatchType?: MatchType;
  artistMatchType?: MatchType;
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
    const timer = setTimeout(onClose, result.gameEnded ? 6000 : 5000);
    return () => clearTimeout(timer);
  }, [onClose, result.gameEnded]);

  const wasStolen = !!result.stolenBy;
  const songLost = !result.activePlayerCorrect && !wasStolen;

  const hasFuzzyMatch =
    result.nameMatchType === "fuzzy" || result.artistMatchType === "fuzzy";
  const allExactMatches =
    result.guessWasCorrect &&
    result.nameMatchType === "exact" &&
    result.artistMatchType === "exact";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 animate-in zoom-in-95 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <CardContent className="py-8 text-center">
          {result.gameEnded ? (
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
                Final song: {(result.song.displayName ?? result.song.name)} ({result.song.year})
              </div>
            </>
          ) : (
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
              <div className="text-lg font-medium">{(result.song.displayName ?? result.song.name)}</div>
              <div className="text-muted-foreground">{result.song.artist}</div>
              <div className="text-2xl font-bold text-primary mt-2">
                {result.song.year}
              </div>

              {/* Token badge for exact matches - no comparison needed */}
              {allExactMatches && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-700 dark:text-green-400">
                  <span>🎯</span>
                  <span className="font-medium">+1</span>
                  <span className="text-lg">🪙</span>
                </div>
              )}

              {/* Close enough section for fuzzy matches */}
              {result.guessWasCorrect && hasFuzzyMatch && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 text-left">
                  <div className="text-base font-medium mb-3 text-center text-green-700 dark:text-green-400">
                    Close enough! +1 🪙
                  </div>
                  {result.nameMatchType === "fuzzy" && result.guessedName && (
                    <div className="text-sm text-muted-foreground mb-1">
                      "{result.guessedName}" → {(result.song.displayName ?? result.song.name)}
                    </div>
                  )}
                  {result.artistMatchType === "fuzzy" &&
                    result.guessedArtist && (
                      <div className="text-sm text-muted-foreground">
                        "{result.guessedArtist}" → {result.song.artist}
                      </div>
                    )}
                </div>
              )}

              {/* Failed guess section */}
              {!result.guessWasCorrect &&
                (result.guessedName || result.guessedArtist) && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 text-left">
                    <div className="text-base font-medium mb-2 text-center text-muted-foreground">
                      Bonus Guess
                    </div>
                    {result.guessedName && (
                      <div className="text-sm mb-1">
                        <span
                          className={
                            result.nameCorrect
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {result.nameCorrect ? "✓" : "✗"} Title:{" "}
                          {result.guessedName}
                        </span>
                        {!result.nameCorrect && (
                          <span className="text-muted-foreground">
                            {" "}
                            (was: {(result.song.displayName ?? result.song.name)})
                          </span>
                        )}
                      </div>
                    )}
                    {result.guessedArtist && (
                      <div className="text-sm">
                        <span
                          className={
                            result.artistCorrect
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {result.artistCorrect ? "✓" : "✗"} Artist:{" "}
                          {result.guessedArtist}
                        </span>
                        {!result.artistCorrect && (
                          <span className="text-muted-foreground">
                            {" "}
                            (was: {result.song.artist})
                          </span>
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
