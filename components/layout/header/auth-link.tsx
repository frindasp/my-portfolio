import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { user: any };

export function DesktopAuthLink({ user }: Props) {
  if (user) {
    return (
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 py-2 rounded-full border bg-card hover:bg-muted transition-all text-sm font-semibold">
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
          <User className="h-3 w-3" />
        </div>
        {user.name}
      </Link>
    );
  }

  return (
    <Link href="/login">
      <Button variant="outline" className="rounded-full px-6">
        Login
      </Button>
    </Link>
  );
}
