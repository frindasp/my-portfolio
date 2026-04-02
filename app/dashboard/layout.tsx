"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  MessageSquare, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Zap,
  ShieldCheck,
  ChevronRight,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout, getCurrentUser } from "@/app/actions/messaging";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Verification Codes", href: "/dashboard/otp", icon: ShieldCheck, adminOnly: true },
  { name: "Live Chat (Socket.io)", href: "/dashboard/chat", icon: MessageSquare },
  { name: "Pusher Events", href: "/dashboard/pusher-chat", icon: Zap },
  { name: "Profile", href: "/dashboard/profile", icon: User },
  { name: "History", href: "/dashboard/history", icon: History },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        toast.error("Please login to access the dashboard");
        router.push("/login");
        return;
      }
      setCurrentUser(user);
      setCheckingAuth(false);
    };
    checkAuth();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-[70vh] w-full max-w-full items-center justify-center overflow-x-hidden bg-background">
        <div className="flex flex-col items-center gap-4">
          <Zap className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm font-medium animate-pulse text-muted-foreground tracking-widest uppercase">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 flex h-[calc(100dvh-73px)] min-h-0 w-screen -translate-x-1/2 overflow-hidden bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex h-full min-h-0 w-72 flex-col overflow-hidden border-r bg-card shadow-sm">
        <div className="p-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Portfolio OS</span>
          </Link>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {sidebarItems
            .filter(item => !item.adminOnly || (currentUser?.Role as any)?.name === "Admin")
            .map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                {item.name}
                {isActive && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t p-4">
          <div className="bg-muted/50 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {currentUser?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{currentUser?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-3 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r shadow-2xl transition-transform duration-300 md:hidden",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <span className="text-xl font-bold">Menu</span>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-6 w-6" />
          </Button>
        </div>
        <nav className="p-4 space-y-2">
          {sidebarItems
            .filter(item => !item.adminOnly || (currentUser?.Role as any)?.name === "Admin")
            .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-2xl text-base font-medium",
                pathname === item.href ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-4 px-4 py-4 rounded-2xl text-red-500"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header Bar (Mobile only) */}
        <header className="md:hidden flex items-center justify-between px-4 h-16 bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
               <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold truncate tracking-tight">Portfolio OS</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/chat" className="hidden sm:block">
              <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-bold shadow-lg shadow-primary/20">
                Live Chat
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="rounded-xl hover:bg-muted">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <section className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 lg:p-12 scroll-smooth">
          <div className="max-w-6xl mx-auto h-full space-y-8 sm:space-y-12">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
