"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon,
  Sun,
  Languages,
  MessageCircle,
  Monitor,
  Globe,
  X,
  LayoutGrid,
} from "lucide-react";
import { useThemeSwitch } from "@/hooks/use-theme-switch";
import { useTranslation } from "@/hooks/use-translation";
import { useMessagingStore } from "@/store/use-messaging-store";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/actions/messaging";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ActionDock() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { lang, setLang, t } = useTranslation();
  const { theme, switchTheme } = useThemeSwitch();
  const { isRegistered, setUser, setGuestDialogOpen } = useMessagingStore();
  const router = useRouter();

  // Activity timer
  useEffect(() => {
    if (isMinimized) {
        setIsVisible(true);
        return;
    }

    let timer: NodeJS.Timeout;
    const resetTimer = () => {
      setIsVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIsVisible(false), 5000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("scroll", resetTimer);
    window.addEventListener("keydown", resetTimer);

    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      if (timer) clearTimeout(timer);
    };
  }, [isMinimized]);

  const handleChatClick = async () => {
    const user = await getCurrentUser();
    if (user || isRegistered) {
      if (user && !isRegistered) {
        setUser({ id: user.id, name: user.name, email: user.email });
      }
      router.push("/dashboard/chat");
    } else {
      setGuestDialogOpen(true);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <AnimatePresence mode="wait">
        {!isMinimized ? (
          isVisible && (
            <motion.div
              key="full-dock"
              initial={{ y: 100, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 1.2,
                filter: "blur(20px)",
                transition: { duration: 0.8, ease: "circIn" },
              }}
              className="fixed bottom-8 inset-x-0 flex justify-center z-[100] px-6 pointer-events-none"
            >
              <div 
                ref={containerRef}
                className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-white/20 bg-zinc-900/80 dark:bg-white/80 backdrop-blur-lg shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-white/10 transition-all duration-500 pointer-events-auto"
              >
                {/* Theme Toggle */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger className="relative p-2.5 rounded-2xl hover:bg-white/10 active:scale-95 transition-all outline-none group text-white dark:text-zinc-900">
                        <div className="relative h-4 w-4">
                          <Sun className="absolute h-4 w-4 scale-100 dark:scale-0 transition-transform duration-500 rotate-0 dark:rotate-90" />
                          <Moon className="absolute h-4 w-4 scale-0 dark:scale-100 transition-transform duration-500 -rotate-90 dark:rotate-0" />
                        </div>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="rounded-xl bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md border border-white/10 dark:border-zinc-200 text-[10px] font-bold uppercase tracking-widest text-white dark:text-zinc-900"
                    >
                      {t.common.dock.theme}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    sideOffset={15}
                    className="rounded-2xl p-2 bg-zinc-900/90 dark:bg-white/95 backdrop-blur-lg border border-white/20 dark:border-zinc-200 shadow-2xl min-w-[140px]"
                  >
                    <DropdownMenuItem
                      onClick={() => switchTheme("light")}
                      className="rounded-xl flex items-center justify-between px-3 py-2 cursor-pointer text-white/70 hover:text-white hover:bg-white/10 dark:text-zinc-900/70 dark:hover:text-zinc-900 dark:hover:bg-zinc-900/10 transition-colors text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />{" "}
                        <span>{t.common.themes.light}</span>
                      </div>
                      {theme === "light" && (
                        <div className="h-1 w-1 rounded-full bg-white dark:bg-zinc-900 shadow-[0_0_8px_white] dark:shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => switchTheme("dark")}
                      className="rounded-xl flex items-center justify-between px-3 py-2 cursor-pointer text-white/70 hover:text-white hover:bg-white/10 dark:text-zinc-900/70 dark:hover:text-zinc-900 dark:hover:bg-zinc-900/10 transition-colors text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />{" "}
                        <span>{t.common.themes.dark}</span>
                      </div>
                      {theme === "dark" && (
                        <div className="h-1 w-1 rounded-full bg-white dark:bg-zinc-900 shadow-[0_0_8px_white] dark:shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => switchTheme("system")}
                      className="rounded-xl flex items-center justify-between px-3 py-2 cursor-pointer text-white/70 hover:text-white hover:bg-white/10 dark:text-zinc-900/70 dark:hover:text-zinc-900 dark:hover:bg-zinc-900/10 transition-colors text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />{" "}
                        <span>{t.common.themes.system}</span>
                      </div>
                      {theme === "system" && (
                        <div className="h-1 w-1 rounded-full bg-white dark:bg-zinc-900 shadow-[0_0_8px_white] dark:shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                {/* Language Toggle */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger className="p-2.5 rounded-2xl hover:bg-white/10 active:scale-95 transition-all outline-none text-white dark:text-zinc-900">
                        <Globe className="h-4 w-4" />
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="rounded-xl bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md border border-white/10 dark:border-zinc-200 text-[10px] font-bold uppercase tracking-widest text-white dark:text-zinc-900"
                    >
                      {t.common.dock.language}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    sideOffset={15}
                    className="rounded-2xl p-2 bg-zinc-900/90 dark:bg-white/95 backdrop-blur-lg border border-white/20 dark:border-zinc-200 shadow-2xl min-w-[140px]"
                  >
                    <DropdownMenuItem
                      onClick={() => setLang("id")}
                      className={cn(
                        "rounded-xl flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-xs font-semibold",
                        lang === "id"
                          ? "text-white bg-white/20 dark:text-zinc-900 dark:bg-zinc-900/10"
                          : "text-white/70 hover:text-white hover:bg-white/10 dark:text-zinc-900/70 dark:hover:text-zinc-900 dark:hover:bg-zinc-900/10",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base grayscale-0">🇮🇩</span>{" "}
                        <span>Indonesia</span>
                      </div>
                      {lang === "id" && (
                        <div className="h-1 w-1 rounded-full bg-white dark:bg-zinc-900 shadow-[0_0_8px_white] dark:shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setLang("en")}
                      className={cn(
                        "rounded-xl flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-xs font-semibold",
                        lang === "en"
                          ? "text-white bg-white/20 dark:text-zinc-900 dark:bg-zinc-900/10"
                          : "text-white/70 hover:text-white hover:bg-white/10 dark:text-zinc-900/70 dark:hover:text-zinc-900 dark:hover:bg-zinc-900/10",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇺🇸</span> <span>English</span>
                      </div>
                      {lang === "en" && (
                        <div className="h-1 w-1 rounded-full bg-white dark:bg-zinc-900 shadow-[0_0_8px_white] dark:shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                {/* Chat Trigger */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleChatClick}
                      className="relative p-2.5 rounded-2xl hover:bg-white/10 active:scale-95 transition-all text-white dark:text-zinc-900 outline-none group"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="rounded-xl bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md border border-white/10 dark:border-zinc-200 text-[10px] font-bold uppercase tracking-widest text-white dark:text-zinc-900"
                  >
                    {t.common.dock.chat}
                  </TooltipContent>
                </Tooltip>

                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                {/* Close/Minimize Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button 
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 rounded-full hover:bg-white/20 active:scale-90 transition-all text-white/40 hover:text-white dark:text-zinc-900/40 dark:hover:text-zinc-900"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="rounded-xl bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md border border-white/10 dark:border-zinc-200 text-[10px] font-bold uppercase tracking-widest text-white dark:text-zinc-900">
                        Minimize
                    </TooltipContent>
                </Tooltip>
              </div>
            </motion.div>
          )
        ) : (
          <motion.div
            key="minimized-bubble"
            drag
            dragMomentum={false}
            dragConstraints={{ 
              left: typeof window !== "undefined" ? -window.innerWidth + 60 : -500, 
              right: 0, 
              top: 0, 
              bottom: typeof window !== "undefined" ? window.innerHeight - 60 : 500 
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="fixed top-8 right-8 z-[110]"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onPointerUp={(e) => {
                // If it was a drag, don't restore
                if (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2) return;
                setIsMinimized(false);
              }}
              className="h-10 w-10 rounded-full flex items-center justify-center border border-white/20 bg-zinc-900 dark:bg-white shadow-2xl text-white dark:text-zinc-900 backdrop-blur-xl group relative overflow-hidden"
            >
              <LayoutGrid className="h-4.5 w-4.5 group-hover:rotate-12 transition-transform" />
              <div className="absolute inset-0 bg-white/10 dark:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Pulsing ring indicator */}
              <span className="absolute inset-0 rounded-full border border-primary/50 animate-ping opacity-25" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
