"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import { DesktopAuthLink } from "./auth-link";
import { DesktopNav } from "./desktop-nav";
import { MobileMenu } from "./mobile-menu";

export function HeaderIndex() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-[60] backdrop-blur-md border-b bg-background/80">
      <div className="container mx-auto px-4 py-4 lg:px-24">
        <div className="flex justify-between items-center gap-4">
          <DesktopNav />
          <MobileMenu user={user} />
          <div className="hidden lg:flex items-center gap-3">
            <DesktopAuthLink user={user} />
          </div>
        </div>
      </div>
    </header>
  );
}
