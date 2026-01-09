"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Props = {
  status: "pending" | "in_progress" | "complete" | null;
  progress: number;
  total: number;
};

export function YearLookupProgress({ status, progress, total }: Props) {
  if (status === null || status === "pending") {
    return null;
  }

  if (status === "complete") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        <span>Song data ready</span>
      </div>
    );
  }

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>
          Fetching song data... {progress}/{total}
        </span>
      </div>
      <Progress value={percentage} className="h-1 w-24" />
    </div>
  );
}
