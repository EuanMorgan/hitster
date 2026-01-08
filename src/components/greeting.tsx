"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function Greeting() {
  const trpc = useTRPC();
  const { data, isLoading, error } = useQuery(
    trpc.hello.queryOptions({ name: "Hitster Player" }),
  );

  if (isLoading)
    return <span className="text-muted-foreground">Loading...</span>;
  if (error) return <span className="text-destructive">Error loading</span>;
  return <span>{data?.greeting}</span>;
}
