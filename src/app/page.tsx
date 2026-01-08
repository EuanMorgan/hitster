import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Greeting } from "@/components/greeting";
import { UserMenu } from "@/components/user-menu";
import { CreateGameButton } from "@/components/create-game-button";
import { trpc, HydrateClient } from "@/trpc/server";

export default async function Home() {
  void trpc.hello.prefetch({ name: "Hitster Player" });

  return (
    <HydrateClient>
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Hitster</CardTitle>
            <CardDescription>
              <Greeting />
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button asChild variant="default" className="flex-1">
                <Link href="/join">Join Game</Link>
              </Button>
              <CreateGameButton />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="w-full">
              <UserMenu />
            </div>
          </CardFooter>
        </Card>
      </div>
    </HydrateClient>
  );
}
