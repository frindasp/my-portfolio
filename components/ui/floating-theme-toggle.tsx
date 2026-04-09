"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeSwitch } from "@/hooks/use-theme-switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FloatingThemeToggle() {
  const { theme, switchTheme } = useThemeSwitch();

  return (
    <div className="fixed bottom-5 right-5 z-[70]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full shadow-lg border-2 hover:border-primary/50 transition-all">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={12} className="rounded-2xl p-2 min-w-[120px] shadow-2xl border-primary/10">
          <DropdownMenuItem 
            onClick={() => switchTheme("light")}
            className={cn("rounded-xl cursor-pointer py-2.5 px-3 flex items-center justify-between", theme === "light" && "bg-primary/5 text-primary font-bold")}
          >
            <span>Light</span>
            {theme === "light" && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => switchTheme("dark")}
            className={cn("rounded-xl cursor-pointer py-2.5 px-3 flex items-center justify-between", theme === "dark" && "bg-primary/5 text-primary font-bold")}
          >
            <span>Dark</span>
            {theme === "dark" && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => switchTheme("system")}
            className={cn("rounded-xl cursor-pointer py-2.5 px-3 flex items-center justify-between", theme === "system" && "bg-primary/5 text-primary font-bold")}
          >
            <span>System</span>
            {theme === "system" && <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
