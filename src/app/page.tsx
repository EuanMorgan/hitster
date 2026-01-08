import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Greeting } from "@/components/greeting";
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
            <Input placeholder="Enter game PIN" />
            <div className="flex gap-2">
              <Button variant="default">Join Game</Button>
              <Button variant="secondary">Create Game</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </HydrateClient>
  );
}
