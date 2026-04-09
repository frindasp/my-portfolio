"use client";

import Link from "next/link";
import { User, LogOut, Settings, Moon, Sun, Languages, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useState } from "react";

type Props = { user: any };

export function DesktopAuthLink({ user }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [lang, setLang] = useState("id");

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-2 rounded-full border bg-card hover:bg-muted transition-all text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="h-3 w-3" />
            </div>
            {user.name}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-primary/10">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Account</DropdownMenuLabel>
          <Link href="/dashboard/profile">
            <DropdownMenuItem className="rounded-xl cursor-pointer gap-2 py-2.5">
              <User className="h-4 w-4 text-primary" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
          
          <DropdownMenuSeparator className="bg-primary/5" />
          
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">Preferences</DropdownMenuLabel>
          <Link href="/dashboard/settings">
            <DropdownMenuItem className="rounded-xl cursor-pointer gap-2 py-2.5">
              <Settings className="h-4 w-4 text-primary" />
              <span>Settings</span>
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator className="bg-primary/5" />
          
          <DropdownMenuItem 
            onClick={handleLogout}
            className="rounded-xl cursor-pointer gap-2 py-2.5 text-red-500 focus:text-red-500 focus:bg-red-500/5"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Link href="/login">
      <Button variant="outline" className="rounded-full px-6 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
        Login
      </Button>
    </Link>
  );
}

