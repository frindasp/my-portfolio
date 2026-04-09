"use client";

import { useTheme } from "next-themes";
import { toast } from "sonner";

export function useThemeSwitch() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const switchTheme = (newTheme: string) => {
    setTheme(newTheme);
    const themeName = newTheme === "system" ? "System" : newTheme.charAt(0).toUpperCase() + newTheme.slice(1);
    
    toast.success(`${themeName} Mode Activated`, {
      description: `Switched interface theme to ${newTheme}.`,
      duration: 2000,
    });
  };

  return { theme, switchTheme, setTheme, resolvedTheme };
}
