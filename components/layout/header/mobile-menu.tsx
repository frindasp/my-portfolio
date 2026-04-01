"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { LayoutDashboard, LogIn, LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { navItems } from "./nav-items";

type Props = { user: any };

export function MobileMenu({ user }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logout();
        toast.success("Logged out");
        setIsOpen(false);
        router.push("/login");
      } catch {
        toast.error("Failed to logout");
      }
    });
  };

  return (
    <div className="flex items-center gap-4 lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[85vw] flex flex-col h-dvh">
          <nav className="flex flex-col space-y-6 mt-12 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-2xl font-bold"
                onClick={() => setIsOpen(false)}>
                {item.label}
              </Link>
            ))}
            <div className="pt-8 border-t">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="flex items-center gap-3 p-4 rounded-2xl border font-semibold"
                onClick={() => setIsOpen(false)}>
                {user ? <LayoutDashboard className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                {user ? "Dashboard" : "Sign In"}
              </Link>
            </div>
          </nav>

          {user && (
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isPending}
              className="mt-auto mb-3 justify-start rounded-2xl px-4 py-6 text-red-500 hover:bg-red-500/10 hover:text-red-500">
              <LogOut className="h-5 w-5" />
              {isPending ? "Logging out..." : "Logout"}
            </Button>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
