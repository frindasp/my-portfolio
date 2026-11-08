"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Image, KeyRound, Palette, Globe, History } from "lucide-react";
import { cn } from "@/lib/utils";

const settingTabs = [
  { name: "Profile", href: "/dashboard/settings/profile", icon: User },
  { name: "Avatar", href: "/dashboard/settings/avatar", icon: Image },
  { name: "Password", href: "/dashboard/settings/password", icon: KeyRound },
  { name: "Theme", href: "/dashboard/settings/theme", icon: Palette },
  { name: "Language", href: "/dashboard/settings/language", icon: Globe },
  { name: "History", href: "/dashboard/settings/history", icon: History },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Settings Tab Navigation Header */}
      <div className="flex items-center gap-1.5 p-1.5 bg-card/60 backdrop-blur-md border rounded-2xl overflow-x-auto no-scrollbar">
        {settingTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}

