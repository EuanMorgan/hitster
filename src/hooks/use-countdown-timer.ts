"use client";

import { useEffect, useRef, useState } from "react";

const TIMER_UPDATE_MS = 100;

interface UseCountdownTimerOptions {
  endTime: string | null;
  duration: number;
  onTimeUp?: () => void;
  isPaused?: boolean;
}

interface UseCountdownTimerReturn {
  timeLeft: number;
  percentage: number;
  colorClass: string;
  barColorClass: string;
  shouldPulse: boolean;
}

export function useCountdownTimer({
  endTime,
  duration,
  onTimeUp,
  isPaused = false,
}: UseCountdownTimerOptions): UseCountdownTimerReturn {
  const [timeLeft, setTimeLeft] = useState(duration);
  const hasTriggeredRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);

  // Keep callback ref current without triggering effect
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  });

  // Reset triggered state when endTime changes (new phase)
  useEffect(() => {
    hasTriggeredRef.current = false;
  }, [endTime]);

  useEffect(() => {
    if (!endTime || isPaused) {
      return;
    }

    const endTimeMs = new Date(endTime).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((endTimeMs - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        onTimeUpRef.current?.();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, TIMER_UPDATE_MS);
    return () => clearInterval(interval);
  }, [endTime, isPaused]);

  const percentage = (timeLeft / duration) * 100;

  const colorClass = isPaused
    ? "text-muted-foreground"
    : percentage <= 25
      ? "text-red-500"
      : percentage <= 50
        ? "text-amber-500"
        : "text-green-500";

  const barColorClass = isPaused
    ? "bg-muted-foreground"
    : percentage <= 25
      ? "bg-red-500"
      : percentage <= 50
        ? "bg-amber-500"
        : "bg-green-500";

  const shouldPulse = !isPaused && timeLeft <= 5 && timeLeft > 0;

  return { timeLeft, percentage, colorClass, barColorClass, shouldPulse };
}
