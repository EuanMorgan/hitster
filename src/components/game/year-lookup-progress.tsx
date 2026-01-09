"use client";

import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Props = {
  status: "pending" | "in_progress" | "complete" | null;
  progress: number;
  total: number;
};

export function YearLookupProgress({ status, progress, total }: Props) {
  if (status === null || status === "pending" || status === "complete") {
    return null;
  }

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground/70">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="hidden sm:inline">
        {progress}/{total}
      </span>
      <Progress value={percentage} className="h-0.5 w-12 sm:w-16" />
    </div>
  );
}
