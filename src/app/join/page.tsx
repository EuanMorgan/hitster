"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AvatarSelector } from "@/components/avatar-selector";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";

type Step = "pin" | "details";

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") ?? "";

  const [step, setStep] = useState<Step>(initialPin ? "details" : "pin");
  const [pin, setPin] = useState(initialPin.toUpperCase());
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🎵");
  const [error, setError] = useState("");

  const trpc = useTRPC();

  const validatePinQuery = useQuery({
    ...trpc.game.validatePin.queryOptions({ pin }),
    enabled: pin.length === 4,
  });

  const joinGameMutation = useMutation(
    trpc.game.joinGame.mutationOptions({
      onSuccess: (data) => {
        localStorage.setItem("hitster_player_id", data.playerId);
        localStorage.setItem("hitster_session_id", data.sessionId);
        router.push(`/lobby/${pin}`);
      },
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("PIN must be 4 characters");
      return;
    }

    if (validatePinQuery.data?.valid === false) {
      setError(validatePinQuery.data.reason);
      return;
    }

    if (validatePinQuery.data?.valid) {
      setStep("details");
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    joinGameMutation.mutate({ pin, name: name.trim(), avatar });
  };

  const pinValidation = validatePinQuery.data;
  const isPinValid = pinValidation?.valid === true;
  const isPinChecking = validatePinQuery.isFetching && pin.length === 4;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Game</CardTitle>
          <CardDescription>
            {step === "pin"
              ? "Enter the game PIN to join"
              : "Choose your name and avatar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "pin" ? (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Game PIN</Label>
                <Input
                  id="pin"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().slice(0, 4);
                    setPin(val);
                    setError("");
                  }}
                  placeholder="ABCD"
                  className="text-center text-2xl tracking-widest"
                  maxLength={4}
                  autoFocus
                />
                {isPinChecking && (
                  <p className="text-sm text-muted-foreground">Checking...</p>
                )}
                {pin.length === 4 && isPinValid && (
                  <p className="text-sm text-green-600">
                    Game found! {pinValidation.playerCount}/
                    {pinValidation.maxPlayers} players
                  </p>
                )}
                {pin.length === 4 && pinValidation?.valid === false && (
                  <p className="text-sm text-destructive">
                    {pinValidation.reason}
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={!isPinValid || isPinChecking}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value.slice(0, 50));
                    setError("");
                  }}
                  placeholder="Enter your name"
                  maxLength={50}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Choose Avatar</Label>
                <AvatarSelector value={avatar} onChange={setAvatar} />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("pin")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={joinGameMutation.isPending || !name.trim()}
                  className="flex-1"
                >
                  {joinGameMutation.isPending ? "Joining..." : "Join Game"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function JoinPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Game</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinPageLoading />}>
      <JoinPageContent />
    </Suspense>
  );
}
