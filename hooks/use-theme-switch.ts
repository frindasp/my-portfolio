"use client";

import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useTranslation } from "./use-translation";

export function useThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const switchTheme = (newTheme: string) => {
    setTheme(newTheme);

    // Get localized theme name and toast text
    const themeNames = t.common.themes;
    const themeName =
      themeNames[newTheme as keyof typeof themeNames] || newTheme;
    const toastMsgs = t.common.toasts.theme;

    toast.success(`${themeName} ${toastMsgs.title}`, {
      description: `${toastMsgs.description} ${themeName}.`,
      duration: 2000,
    });
  };

  return { theme, switchTheme, setTheme };
}
