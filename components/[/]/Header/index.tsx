"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LayoutDashboard, LogIn } from "lucide-react";
import { ModeToggle } from "@/components/ui/mode-toggle-button";
import { getCurrentUser } from "@/app/actions/auth";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/contact", label: "Contact" },
];

export function HeaderIndex() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return (
    <header className="sticky top-0 z-[60] backdrop-blur-md border-b bg-background/80">
      <div className="container mx-auto px-4 py-4 lg:px-24">
        <div className="flex justify-between items-center">
          {/* Desktop menu */}
          <nav className="hidden lg:block items-center">
            <ul className="flex items-center space-x-6 text-sm font-medium">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Mobile menu Button */}
          <div className="flex items-center gap-4 lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80vw]">
                <nav className="flex flex-col space-y-6 mt-12 px-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-2xl font-bold flex items-center justify-between group"
                      onClick={() => setIsOpen(false)}>
                      {item.label}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </Link>
                  ))}
                  <div className="pt-8 border-t space-y-4">
                     {user ? (
                        <Link 
                          href="/dashboard"
                          className="flex items-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground font-semibold"
                          onClick={() => setIsOpen(false)}
                        >
                          <LayoutDashboard className="h-5 w-5" /> Dashboard
                        </Link>
                     ) : (
                        <Link 
                          href="/login"
                          className="flex items-center gap-3 p-4 rounded-2xl border font-semibold"
                          onClick={() => setIsOpen(false)}
                        >
                          <LogIn className="h-5 w-5" /> Sign In
                        </Link>
                     )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-4">
             {/* Main Auth Link (Desktop) */}
             <div className="hidden lg:flex items-center gap-3">
                {user ? (
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-2 px-4 py-2 rounded-full border bg-card hover:bg-muted transition-all text-sm font-semibold"
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                       <User className="h-3 w-3" />
                    </div>
                    {user.name}
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button variant="outline" className="rounded-full px-6">Login</Button>
                  </Link>
                )}
             </div>
             <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
