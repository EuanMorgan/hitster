import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function GameSkeleton() {
  return (
    <div className="min-h-screen p-4 animate-in fade-in duration-150">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header skeleton */}
        <Card>
          <CardHeader className="text-center pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex items-center justify-between">
              <div className="w-9" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <Skeleton className="h-4 w-32 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex justify-center gap-4 sm:gap-8">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>

        {/* Current turn skeleton */}
        <Card className="bg-muted/50">
          <CardContent className="py-4 sm:py-6 px-3 sm:px-6">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
              <div className="text-center space-y-2">
                <Skeleton className="h-3 w-20 mx-auto" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
            <Skeleton className="h-4 w-40 mx-auto mt-4" />
          </CardContent>
        </Card>

        {/* Players section skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-20" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg p-3 sm:p-4 bg-muted">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  {[1, 2].map((j) => (
                    <Skeleton
                      key={j}
                      className="h-14 w-16 sm:h-16 sm:w-20 rounded-lg"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
