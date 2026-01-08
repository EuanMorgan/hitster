"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Player {
  id: string;
  name: string;
  avatar: string;
}

interface TurnShuffleAnimationProps {
  players: Player[];
  turnOrder: string[];
  roundNumber?: number;
  onComplete: () => void;
}

export function TurnShuffleAnimation({
  players,
  turnOrder,
  roundNumber,
  onComplete,
}: TurnShuffleAnimationProps) {
  const [phase, setPhase] = useState<"shuffling" | "settled">("shuffling");
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  const orderedPlayers = turnOrder
    .map((id) => players.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);

  useEffect(() => {
    const indices = Array.from({ length: orderedPlayers.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);

    const settleTimer = setTimeout(() => setPhase("settled"), 100);
    const completeTimer = setTimeout(onComplete, 2500);

    return () => {
      clearTimeout(settleTimer);
      clearTimeout(completeTimer);
    };
  }, [orderedPlayers.length, onComplete]);

  const getTransform = (finalIndex: number) => {
    if (phase === "shuffling" && shuffledIndices.length > 0) {
      const shuffledPos = shuffledIndices[finalIndex];
      const offset = (shuffledPos - finalIndex) * 80;
      return `translateY(${offset}px) rotate(${(shuffledPos - finalIndex) * 5}deg)`;
    }
    return "translateY(0) rotate(0deg)";
  };

  return (
    <Card className="border-2 border-dashed border-primary/50 bg-primary/5 overflow-hidden">
      <CardContent className="py-6 sm:py-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2 animate-bounce">🎲</div>
          <div className="text-lg font-medium">
            {roundNumber && roundNumber > 1
              ? `Round ${roundNumber} - New Turn Order!`
              : "Shuffling Turn Order..."}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 sm:gap-3">
          {orderedPlayers.map((player, index) => (
            <div
              key={player.id}
              className="w-full max-w-xs transition-all ease-out"
              style={{
                transform: getTransform(index),
                transitionDuration: phase === "settled" ? "700ms" : "0ms",
              }}
            >
              <div
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-500 ${
                  index === 0 && phase === "settled"
                    ? "bg-primary/20 border-2 border-primary ring-2 ring-primary/30 scale-105"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                  {index + 1}
                </div>
                <span className="text-2xl">{player.avatar}</span>
                <span className="font-medium truncate flex-1">
                  {player.name}
                </span>
                {index === 0 && phase === "settled" && (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded animate-pulse">
                    First
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {phase === "settled" && (
          <div className="text-center mt-6 text-sm text-muted-foreground animate-in fade-in-0 duration-500">
            Game starting...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
