"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/auth-client";
import { SpotifyLoginButton } from "./spotify-login-button";

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  if (isPending) {
    return <div className="h-10 w-full animate-pulse rounded-md bg-muted" />;
  }

  if (!session?.user) {
    return <SpotifyLoginButton />;
  }

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          {session.user.image && (
            <img
              src={session.user.image}
              alt=""
              className="h-8 w-8 rounded-full"
            />
          )}
          <span className="truncate font-medium text-sm">
            {session.user.name || session.user.email}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        asChild
      >
        <Link href="/dashboard">View Game History</Link>
      </Button>
    </div>
  );
}
