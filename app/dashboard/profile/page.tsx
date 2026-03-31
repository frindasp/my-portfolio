"use client";

import { useState, useEffect } from "react";
import { User, Mail, Shield, Zap, Sparkles, LogOut, ArrowLeft, Loader2, Fingerprint, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logout, getCurrentUser, updateCurrentUserFullName } from "@/app/actions/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SecuritySettings } from "@/components/SecuritySettings";

import { useProfileStore } from "@/store/use-profile-store";

type Tab = "general" | "security";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const { activeTab, setActiveTab } = useProfileStore();
  const router = useRouter();

  useEffect(() => {
    setIsHydrated(true);
    const loadProfile = async () => {
      const u = await getCurrentUser();
      setUser(u);
      setFullName(u?.name ?? "");
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Disconnected safety.");
    router.push("/login");
  };

  const handleUpdateFullName = async () => {
    if (!fullName.trim()) {
      toast.error("Full name is required.");
      return;
    }

    setSaving(true);
    const result = await updateCurrentUserFullName(fullName);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Failed to update profile.");
      return;
    }

    const updatedName = result.user?.name ?? "";
    setUser((prev: any) => ({ ...prev, name: updatedName }));
    setFullName(updatedName);
    toast.success("Full name updated.");
  };

  if (!isHydrated || loading) return (
     <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold tracking-widest uppercase opacity-40 italic">Syncing Profile...</p>
     </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in duration-500">
      {/* Profile Header */}
      <div className="p-10 border rounded-[32px] bg-card shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform">
            <Sparkles className="h-48 w-48 text-primary shadow-2xl" />
         </div>
         <div className="flex flex-col md:flex-row items-center gap-10 relative z-10 text-center md:text-left">
            <div className="h-32 w-32 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground font-black text-6xl shadow-2xl shadow-primary/30 transform transition-transform hover:scale-105 active:scale-95 duration-300">
               {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-3">
               <h1 className="text-4xl font-extrabold tracking-tighter">{user?.name}</h1>
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                  <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/10">Member Since Mar 2026</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground"><Shield className="h-4 w-4 text-green-500" /> Active Verified</span>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         {/* Details Panel */}
         <div className="lg:col-span-2 space-y-8">
            {activeTab === "general" ? (
               <div className="space-y-8">
                  <div className="bg-card border rounded-[32px] p-8 space-y-8">
                     <div className="flex items-center gap-3 pb-6 border-b">
                        <User className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-black italic tracking-tight">Account Details</h3>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                           <div className="space-y-3">
                              <Input
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="h-12 rounded-2xl bg-muted/30 font-bold border-muted-foreground/10 focus:ring-primary/20"
                              />
                              <Button
                                type="button"
                                onClick={handleUpdateFullName}
                                disabled={saving || fullName.trim() === (user?.name ?? "")}
                                className="h-10 rounded-xl font-bold"
                              >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Full Name
                              </Button>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
                           <Input readOnly defaultValue={user?.email} className="h-12 rounded-2xl bg-muted/30 font-bold border-muted-foreground/10 focus:ring-primary/20" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Role</label>
                           <div className="h-12 flex items-center px-4 rounded-2xl bg-primary/5 border border-primary/20 text-primary font-black text-sm uppercase italic tracking-widest">
                              {user?.role?.name || "User"} Member
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-card border rounded-[32px] p-8 space-y-8 group hover:shadow-2xl transition-all border-amber-500/20">
                     <div className="flex items-center gap-3">
                        <Zap className="h-6 w-6 text-amber-500" />
                        <h3 className="text-2xl font-black italic tracking-tight">Advanced Settings</h3>
                     </div>
                     <p className="text-sm text-muted-foreground leading-relaxed">Customize your experience and manage your data notifications and security parameters from this section.</p>
                     <Button variant="outline" onClick={() => setActiveTab("security")} className="h-12 rounded-2xl font-bold border-amber-500/20 text-amber-600 hover:bg-amber-500/10">Manage Data & Privacy</Button>
                  </div>
               </div>
            ) : (
               <SecuritySettings user={user} />
            )}
         </div>

         {/* Sidebar Actions */}
         <div className="space-y-6">
            <div className="p-8 bg-neutral-900 rounded-[32px] shadow-2xl text-white space-y-6">
               <h3 className="text-2xl font-black italic">Settings</h3>
               <div className="space-y-2">
                  <Button 
                     variant="ghost" 
                     onClick={() => setActiveTab("general")}
                     className={`w-full justify-start rounded-2xl font-bold transition-all overflow-hidden group/btn relative ${activeTab === "general" ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                     <User className="h-4 w-4 mr-2" /> General
                  </Button>
                  <Button 
                     variant="ghost" 
                     onClick={() => setActiveTab("security")}
                     className={`w-full justify-start rounded-2xl font-bold transition-all overflow-hidden group/btn relative ${activeTab === "security" ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
                  >
                     <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                     <Fingerprint className="h-4 w-4 mr-2" /> Security
                  </Button>
                  <Button variant="ghost" className="w-full justify-start rounded-2xl font-bold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all overflow-hidden group/btn relative">
                     Notification Settings
                  </Button>
               </div>
               <div className="pt-6 border-t border-white/10">
                  <Button onClick={handleLogout} className="w-full h-12 rounded-2xl font-black bg-red-500 hover:bg-red-600 transition-all shadow-xl shadow-red-500/20">
                     <LogOut className="h-5 w-5 mr-3" /> LOGOUT
                  </Button>
               </div>
            </div>

            <button onClick={() => router.back()} className="w-full h-16 flex items-center justify-center gap-3 border-2 border-dashed border-muted rounded-[32px] text-muted-foreground hover:border-primary hover:text-primary transition-all font-black text-sm uppercase tracking-widest group">
               <ArrowLeft className="h-5 w-5 group-hover:-translate-x-2 transition-transform" /> Go Back
            </button>
         </div>
      </div>
    </div>
  );
}

