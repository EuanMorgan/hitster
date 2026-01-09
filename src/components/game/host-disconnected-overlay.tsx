import { Card, CardContent } from "@/components/ui/card";

export function HostDisconnectedOverlay() {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="py-8 text-center">
          <div className="text-5xl mb-4 animate-pulse">📡</div>
          <div className="text-xl font-bold mb-2">Waiting for host...</div>
          <div className="text-muted-foreground text-sm">
            The host has disconnected. Game will resume when they reconnect.
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-amber-500">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce" />
            <div
              className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
