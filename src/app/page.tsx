import Link from "next/link";
import { CreateGameButton } from "@/components/create-game-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserMenu } from "@/components/user-menu";
import { HydrateClient } from "@/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <HydrateClient>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold">Hitster</CardTitle>
              <ThemeToggle />
            </div>
            <p className="text-muted-foreground text-lg">
              Ready to test your music knowledge?
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pb-6">
            <div className="flex gap-3">
              <Button asChild variant="default" size="lg" className="flex-1">
                <Link href="/join">Join Game</Link>
              </Button>
              <CreateGameButton />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <div className="w-full">
              <UserMenu />
            </div>
          </CardFooter>
        </Card>
      </div>
    </HydrateClient>
  );
}
