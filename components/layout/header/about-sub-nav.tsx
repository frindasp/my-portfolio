"use client";

import { usePathname } from "next/navigation";
import { useAboutTab, type AboutTab } from "@/store/about-tab-store";
import { User, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs: { id: AboutTab; label: string; icon: React.ElementType }[] = [
  { id: "about", label: "About", icon: User },
  { id: "experience", label: "Experience", icon: Briefcase },
];

export function AboutSubNav() {
  const pathname = usePathname();
  const { activeTab, setActiveTab } = useAboutTab();

  // Only render on /about page
  if (!pathname || !pathname.startsWith("/about")) return null;

  return (
    <div className="border-b bg-background/60 backdrop-blur-sm">
      <div className="container mx-auto px-4 lg:px-24">
        <nav className="flex gap-1" aria-label="About page sections">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                "hover:text-foreground focus-visible:outline-none",
                activeTab === id
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              aria-current={activeTab === id ? "page" : undefined}
            >
              <Icon className="w-4 h-4" />
              {label}
              {/* Active underline indicator */}
              {activeTab === id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-t-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
