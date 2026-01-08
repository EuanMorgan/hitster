"use client";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
