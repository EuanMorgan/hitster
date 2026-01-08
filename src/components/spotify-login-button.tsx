"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export function SpotifyLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    await signIn.social({
      provider: "spotify",
      callbackURL: "/",
    });
  };

  return (
    <Button onClick={handleLogin} disabled={isLoading} className="w-full">
      {isLoading ? "Connecting..." : "Login with Spotify"}
    </Button>
  );
}
