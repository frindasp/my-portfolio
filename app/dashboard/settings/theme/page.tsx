"use client";

import { useThemeSwitch } from "@/hooks/use-theme-switch";
import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Palette, Check } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export default function ThemeSettingsPage() {
  const { theme, switchTheme } = useThemeSwitch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themeOptions = [
    { value: "light", label: "Light Theme (Terang)" },
    { value: "dark", label: "Dark Theme (Gelap)" },
    { value: "system", label: "System Default (Otomatis)" },
  ];

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          Theme Settings
        </h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
          Sesuaikan skema tema warna dan tampilan aplikasi
        </p>
      </div>

      <div className="bg-card border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pilih Tema (Combobox Autocomplete)
          </label>
          <Combobox
            options={themeOptions}
            value={theme}
            onChange={(val) => switchTheme(val)}
            placeholder="Pilih tema tampilan..."
            searchPlaceholder="Cari tema..."
            className="w-full h-11"
          />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <button
            onClick={() => switchTheme("light")}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 text-center",
              theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
            )}
          >
            <Sun className="h-6 w-6 text-amber-500" />
            <span className="text-xs font-bold">Light</span>
          </button>

          <button
            onClick={() => switchTheme("dark")}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 text-center",
              theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
            )}
          >
            <Moon className="h-6 w-6 text-indigo-400" />
            <span className="text-xs font-bold">Dark</span>
          </button>

          <button
            onClick={() => switchTheme("system")}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 text-center",
              theme === "system" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
            )}
          >
            <Monitor className="h-6 w-6 text-emerald-400" />
            <span className="text-xs font-bold">System</span>
          </button>
        </div>
      </div>
    </div>
  );
}

