import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Hitster</CardTitle>
          <CardDescription>
            A multiplayer music timeline game
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
  );
}
