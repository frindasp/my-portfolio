"use client";

import { useThemeSwitch } from "@/hooks/use-theme-switch";
import { useState, useEffect } from "react";
import { Moon, Sun, Globe, Check, Settings as SettingsIcon, Monitor, Sparkles, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, switchTheme, resolvedTheme } = useThemeSwitch();
  const [lang, setLang] = useState("id");
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    { 
      id: "light", 
      name: "Light Mode", 
      icon: Sun, 
      color: "text-amber-500", 
      sky: "bg-gradient-to-b from-blue-400 via-blue-200 to-amber-100",
      accent: "bg-amber-500"
    },
    { 
      id: "dark", 
      name: "Dark Mode", 
      icon: Moon, 
      color: "text-indigo-400", 
      sky: "bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-800",
      accent: "bg-indigo-500"
    },
    { 
      id: "system", 
      name: "System Mode", 
      icon: Monitor, 
      color: "text-emerald-400", 
      sky: "bg-gradient-to-br from-zinc-800 via-emerald-900/20 to-zinc-900",
      accent: "bg-emerald-500"
    },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-primary/5 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter flex items-center gap-4">
            <div className="h-14 w-14 bg-primary rounded-3xl flex items-center justify-center -rotate-6 shadow-2xl shadow-primary/20 ring-4 ring-primary/10">
               <SettingsIcon className="h-8 w-8 text-primary-foreground animate-[spin_10s_linear_infinite]" />
            </div>
            Settings
          </h1>
          <p className="text-muted-foreground mt-3 font-bold uppercase tracking-widest text-xs opacity-70">
            Portfolio OS / Configuration Center
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/40 px-4 py-2 rounded-2xl border border-primary/10 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-tighter">System Version 2.4.0</span>
        </div>
      </div>

      <div className="grid gap-10">
        {/* Appearance Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 ml-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">Display & Appearance</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {themes.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTheme(t.id)}
                  className={cn(
                    "relative group h-64 rounded-[40px] overflow-hidden border-4 transition-all duration-700 text-left",
                    isActive 
                      ? "border-primary shadow-[0_20px_50px_rgba(var(--primary-rgb),0.2)] scale-105 z-10" 
                      : "border-transparent bg-muted/30 hover:bg-muted/50 hover:scale-[1.02] hover:border-primary/10"
                  )}
                >
                  {/* Sky Background */}
                  <div className={cn(
                    "absolute inset-0 transition-all duration-1000 ease-in-out", 
                    t.sky, 
                    isActive ? "opacity-100 scale-100" : "opacity-40 scale-110 group-hover:opacity-70 group-hover:scale-100"
                  )} />
                  
                  {/* Dynamic Weather Elements */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Light: Sun & Rising Animation */}
                    {t.id === "light" && (
                        <>
                            <div className={cn(
                                "absolute h-24 w-24 rounded-full bg-amber-300 blur-2xl transition-all duration-1000 delay-300",
                                isActive ? "top-10 left-10 opacity-60 scale-100" : "-top-10 -left-10 opacity-0 scale-50"
                            )} />
                            <Sun className={cn(
                                "absolute h-12 w-12 text-amber-500 transition-all duration-1000 delay-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]",
                                isActive ? "top-16 left-16 rotate-0" : "top-32 left-0 -rotate-90 opacity-0"
                            )} />
                            <div className="absolute top-20 right-10 h-1 w-12 bg-white/60 rounded-full blur-[1px] animate-[float-cloud_8s_infinite_linear]" />
                            <div className="absolute top-40 left-20 h-1 w-20 bg-white/40 rounded-full blur-[1px] animate-[float-cloud_12s_infinite_linear_reverse]" />
                        </>
                    )}

                    {/* Dark: Moon & Stars */}
                    {t.id === "dark" && (
                        <>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:24px_24px]" />
                            <div className={cn(
                                "absolute h-20 w-20 rounded-full bg-indigo-500/10 blur-3xl transition-all duration-1000",
                                isActive ? "bottom-10 right-10 opacity-100" : "bottom-0 right-0 opacity-0"
                            )} />
                            <Moon className={cn(
                                "absolute h-10 w-10 text-indigo-400 transition-all duration-1000 delay-500 drop-shadow-[0_0_20px_rgba(129,140,248,0.4)]",
                                isActive ? "top-16 right-16 rotate-0" : "top-0 right-0 rotate-45 opacity-0"
                            )} />
                            {isActive && [1,2,3,4,5].map(i => (
                                <div 
                                    key={i} 
                                    className="absolute h-1 w-1 bg-white rounded-full animate-twinkle" 
                                    style={{ 
                                        top: `${20 + i*15}%`, 
                                        left: `${15 + i*12}%`,
                                        animationDelay: `${i * 0.7}s`
                                    }} 
                                />
                            ))}
                        </>
                    )}

                    {/* System: Digital Grid & Pulse */}
                    {t.id === "system" && (
                        <>
                             <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px]" />
                             <div className={cn(
                                 "absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent transition-opacity duration-1000",
                                 isActive ? "opacity-100" : "opacity-0"
                             )} />
                             <Monitor className={cn(
                                 "absolute h-12 w-12 text-emerald-400 transition-all duration-1000 delay-500",
                                 isActive ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100 rotate-0" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-50 -rotate-12 opacity-0"
                             )} />
                             {isActive && (
                                 <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-10 w-full animate-scan" />
                             )}
                        </>
                    )}
                  </div>

                  {/* Content Overlay */}
                  <div className="relative h-full p-8 flex flex-col justify-between z-30">
                    <div className={cn(
                      "h-14 w-14 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-2xl transition-all duration-500 border border-white/10",
                      isActive ? "bg-white/20 ring-4 ring-white/10" : "bg-black/5"
                    )}>
                      <t.icon className={cn("h-7 w-7 transition-all duration-500", t.color, isActive ? "scale-110" : "group-hover:scale-110")} />
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className={cn(
                          "text-xl font-black uppercase italic tracking-tighter transition-colors",
                          t.id === "light" ? "text-slate-900" : "text-white"
                      )}>{t.name}</h3>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                            <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-white/20 backdrop-blur-md border border-white/20">
                                <Check className={cn("h-3 w-3", t.id === "light" ? "text-primary" : "text-white")} />
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", t.id === "light" ? "text-primary" : "text-white")}>Activated</span>
                            </div>
                        ) : (
                            <span className={cn("text-[9px] font-bold uppercase tracking-widest opacity-40", t.id === "light" ? "text-slate-500" : "text-slate-300")}>Switch to {t.id}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover effect light glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_var(--x)_var(--y),rgba(255,255,255,0.1),transparent_40%)] transition-opacity duration-300" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Language & Regions */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 ml-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">Localisation & Language</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { id: "id", name: "Bahasa Indonesia", flag: "🇮🇩", desc: "Native configuration", detail: "Formal / Standard" },
              { id: "en", name: "English (US)", flag: "🇺🇸", desc: "Global configuration", detail: "International Standard" }
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => { setLang(l.id); toast.success(`System Language: ${l.name}`, { icon: l.flag }); }}
                className={cn(
                  "group relative overflow-hidden flex items-center gap-6 p-8 rounded-[40px] border-4 transition-all duration-500",
                  lang === l.id 
                    ? "bg-primary/10 border-primary shadow-2xl shadow-primary/20 scale-[1.03] z-10" 
                    : "bg-muted/30 border-transparent hover:bg-muted/50 hover:border-primary/20"
                )}
              >
                <div className="relative z-10">
                    <span className="text-6xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-700 block drop-shadow-2xl">{l.flag}</span>
                </div>
                <div className="text-left relative z-10 flex-1">
                  <span className={cn("block text-2xl font-black italic uppercase tracking-tighter leading-none mb-1", lang === l.id ? "text-primary" : "text-foreground")}>{l.name}</span>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{l.desc}</span>
                     <span className="h-1 w-1 rounded-full bg-muted-foreground opacity-30" />
                     <span className="text-[10px] font-medium opacity-40">{l.detail}</span>
                  </div>
                </div>
                {lang === l.id && (
                    <div className="relative h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/40 rotate-12">
                        <Check className="h-6 w-6 text-primary-foreground stroke-[4px]" />
                    </div>
                )}

                {/* Decorative background shape */}
                <div className={cn(
                    "absolute -right-10 -bottom-10 h-40 w-40 rounded-full blur-3xl transition-opacity duration-700",
                    lang === l.id ? "bg-primary/20 opacity-100" : "bg-primary/5 opacity-0 group-hover:opacity-100"
                )} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float-cloud {
            from { transform: translateX(-100px); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            to { transform: translateX(150px); opacity: 0; }
        }
        @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes scan {
            from { transform: translateY(-300%); }
            to { transform: translateY(600%); }
        }
        .animate-twinkle {
            animation: twinkle 3s ease-in-out infinite;
        }
        .animate-scan {
            animation: scan 4s linear infinite;
        }
      `}</style>
    </div>
  );
}
