"use client";

import { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock, 
  Zap, 
  ArrowRight,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return (
     <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold tracking-widest uppercase opacity-40">Loading Dashboard...</p>
     </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="relative overflow-hidden p-6 sm:p-10 lg:p-14 rounded-[32px] bg-card border shadow-xl group">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity hidden lg:block">
            <Zap className="h-64 w-64 -rotate-12" />
         </div>
         <div className="relative z-10 space-y-4 sm:space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter leading-tight">
              Welcome back, <br className="sm:hidden" />
              <span className="text-primary">{user?.name?.split(' ')[0] || "User"}</span>!
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Everything is looking good today. You have new messages waiting in your inbox and performance is up 12% from last week.
            </p>
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
               <Link href="/dashboard/chat">
                 <Button className="w-full sm:w-auto h-11 sm:h-14 px-6 sm:px-8 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                    Open Messenger <ArrowRight className="ml-2 h-5 w-5" />
                 </Button>
               </Link>
               <Link href="/dashboard/profile">
                 <Button variant="outline" className="w-full sm:w-auto h-11 sm:h-14 px-6 sm:px-8 rounded-2xl font-bold border-muted-foreground/20 hover:bg-muted transition-all">
                    View Profile
                 </Button>
               </Link>
            </div>
         </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12">
         {[
           { label: "Total Messages", value: "1,284", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
           { label: "New Leads", value: "+42", icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
           { label: "Engagement", value: "84%", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
           { label: "Response Time", value: "< 2h", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
         ].map((stat, i) => (
           <div key={i} className="p-5 sm:p-8 bg-card border rounded-3xl transition-all hover:shadow-xl group">
              <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                 <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
              <h3 className="text-xl sm:text-3xl font-black">{stat.value}</h3>
           </div>
         ))}
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mt-8 sm:mt-12 pb-12">
         <div className="lg:col-span-2 bg-card border rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-6 sm:p-8 border-b bg-muted/20 flex flex-wrap gap-4 justify-between items-center">
               <h3 className="font-bold text-lg sm:text-xl">Recent Activity</h3>
               <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5">View History</Button>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
               {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                     <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border border-muted-foreground/10">JD</div>
                     <div className="flex-1 min-w-0 border-b border-primary/5 pb-4 group-last:border-0 last:pb-0">
                        <p className="text-sm font-bold leading-tight group-hover:text-primary transition-colors pr-4">John Doe sent a new message regarding "Project X"</p>
                        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium"><Clock className="h-3 w-3" /> 2 hours ago</p>
                     </div>
                     <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </div>
               ))}
            </div>
         </div>

         <div className="bg-primary/5 border border-primary/20 rounded-[32px] p-6 sm:p-8 space-y-6 flex flex-col">
            <h3 className="font-black text-xl sm:text-2xl tracking-tight text-primary/80">System Status</h3>
            <div className="space-y-3 sm:space-y-4">
               {[
                 { label: "Database", status: "Operational", color: "text-emerald-500", dot: "bg-emerald-500" },
                 { label: "Socket.io", status: "Active", color: "text-emerald-500", dot: "bg-emerald-500" },
                 { label: "Push Notifications", status: "Standby", color: "text-amber-500", dot: "bg-amber-500" },
               ].map((mod, i) => (
                 <div key={i} className="flex justify-between items-center p-3.5 sm:p-4 bg-card/50 rounded-2xl border border-primary/10 hover:border-primary/30 transition-colors">
                    <span className="text-xs sm:text-sm font-bold opacity-70">{mod.label}</span>
                    <div className="flex items-center gap-2">
                       <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", mod.dot)} />
                       <span className={cn("text-[10px] sm:text-xs font-black uppercase tracking-tighter", mod.color)}>{mod.status}</span>
                    </div>
                 </div>
               ))}
            </div>
            <div className="mt-auto pt-4">
               <Button className="w-full h-11 sm:h-12 rounded-2xl font-bold bg-neutral-900 text-white hover:bg-neutral-800 shadow-lg">System Logs</Button>
            </div>
         </div>
      </div>
    </div>
  );
}
