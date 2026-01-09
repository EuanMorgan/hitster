export function TokenDisplay({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground text-sm">No tokens</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-yellow-500">🪙</span>
      <span className="text-sm font-medium">
        <span className="hidden sm:inline">x</span>
        {count}
      </span>
    </div>
  );
}
