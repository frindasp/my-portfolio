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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Header */}
      <div className="relative overflow-hidden p-6 md:p-12 rounded-[32px] bg-card border shadow-2xl group">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity hidden sm:block">
            <Zap className="h-64 w-64 -rotate-12" />
         </div>
         <div className="relative z-10 space-y-4">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
              Welcome back, <span className="text-primary">{user?.name?.split(' ')[0] || "User"}</span>!
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl">
              Everything is looking good today. You have new messages waiting in your inbox and performance is up 12% from last week.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
               <Link href="/dashboard/chat">
                 <Button className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                    Open Messenger <ArrowRight className="ml-2 h-5 w-5" />
                 </Button>
               </Link>
               <Link href="/dashboard/profile">
                 <Button variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-2xl font-bold border-muted-foreground/20 hover:bg-muted transition-all">
                    View Profile
                 </Button>
               </Link>
            </div>
         </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: "Total Messages", value: "1,284", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
           { label: "New Leads", value: "+42", icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
           { label: "Engagement", value: "84%", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
           { label: "Response Time", value: "< 2h", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
         ].map((stat, i) => (
           <div key={i} className="p-8 bg-card border rounded-3xl transition-all hover:shadow-xl group">
              <div className={cn("h-12 w-12 rounded-2xl mb-6 flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                 <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black">{stat.value}</h3>
           </div>
         ))}
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-card border rounded-[32px] overflow-hidden">
            <div className="p-8 border-b bg-muted/20 flex justify-between items-center">
               <h3 className="font-bold text-xl">Recent Activity</h3>
               <Button variant="ghost" size="sm" className="text-primary font-bold">View History</Button>
            </div>
            <div className="p-8 space-y-6">
               {[1, 2, 3].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center group">
                     <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-bold text-sm shrink-0">JD</div>
                     <div className="flex-1 min-w-0 border-b border-primary/5 pb-4 group-last:border-0">
                        <p className="text-sm font-bold truncate">John Doe sent a new message regarding "Project X"</p>
                        <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                     </div>
                     <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
               ))}
            </div>
         </div>

         <div className="bg-primary/5 border border-primary/20 rounded-[32px] p-8 space-y-6">
            <h3 className="font-black text-2xl tracking-tight">System Status</h3>
            <div className="space-y-4">
               {[
                 { label: "Database", status: "Operational", color: "text-green-500" },
                 { label: "Socket.io", status: "Active", color: "text-green-500" },
                 { label: "Push Notifications", status: "Standby", color: "text-amber-500" },
               ].map((mod, i) => (
                 <div key={i} className="flex justify-between items-center p-4 bg-background/50 rounded-2xl border border-primary/10">
                    <span className="text-sm font-bold opacity-70">{mod.label}</span>
                    <span className={cn("text-xs font-black uppercase tracking-tighter", mod.color)}>{mod.status}</span>
                 </div>
               ))}
            </div>
            <Button className="w-full h-12 rounded-2xl font-bold bg-white text-black hover:bg-neutral-200">System Logs</Button>
         </div>
      </div>
    </div>
  );
}
