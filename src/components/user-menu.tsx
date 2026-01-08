"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { SpotifyLoginButton } from "./spotify-login-button";

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div className="h-10 w-full animate-pulse rounded-md bg-muted" />;
  }

  if (!session?.user) {
    return <SpotifyLoginButton />;
  }

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 overflow-hidden">
        {session.user.image && (
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        )}
        <span className="truncate text-sm font-medium">
          {session.user.name || session.user.email}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}
