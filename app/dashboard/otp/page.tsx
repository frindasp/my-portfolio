"use client";

import { useEffect, useState } from "react";
import { getVerificationTokens } from "@/app/actions/auth";
import { Loader2, RefreshCw, ShieldAlert, Key, Clock, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function OTPManagementPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await getVerificationTokens();
      if (res.success) {
        setTokens(res.tokens || []);
      } else {
        toast.error(res.error || "Failed to load tokens");
      }
    } catch (err) {
      toast.error("Error loading tokens");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const filteredTokens = tokens.filter(t => 
    t.email.toLowerCase().includes(search.toLowerCase()) || 
    t.token.includes(search)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Verification Codes
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">Manage and provide OTP codes to users.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search email or code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-card border-muted"
            />
          </div>
          <Button 
            onClick={fetchTokens} 
            disabled={loading}
            variant="outline"
            className="w-full sm:w-auto h-11 rounded-xl font-bold bg-card border-muted hover:bg-muted"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {loading && tokens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">Fetching latest codes...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="bg-card border-2 border-dashed rounded-3xl p-12 text-center space-y-4">
          <div className="mx-auto h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
             <Key className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold">No active codes found</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">When users request a login or password reset, their codes will appear here.</p>
        </div>
      ) : filteredTokens.length === 0 ? (
        <div className="bg-card border rounded-3xl p-12 text-center space-y-4">
          <p className="text-muted-foreground font-medium">No results matching "{search}"</p>
          <Button variant="link" onClick={() => setSearch("")} className="font-bold">Clear search</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTokens.map((token) => {
            const isExpired = new Date(token.expires) < new Date();
            return (
              <div 
                key={token.id} 
                className={`group relative bg-card border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 ${isExpired ? 'opacity-60 grayscale' : 'hover:-translate-y-1'}`}
              >
                <div className="flex items-start justify-between mb-4">
                   <div className={`p-3 rounded-2xl ${isExpired ? 'bg-muted' : 'bg-primary/10'}`}>
                      <Mail className={`h-6 w-6 ${isExpired ? 'text-muted-foreground' : 'text-primary'}`} />
                   </div>
                   {isExpired ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full">Expired</span>
                   ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> Active
                      </span>
                   )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">User Email</p>
                    <p className="text-lg font-bold truncate leading-none">{token.email}</p>
                  </div>

                  <div className={`p-4 rounded-2xl ${isExpired ? 'bg-muted/50' : 'bg-primary/5'} border-2 ${isExpired ? 'border-muted' : 'border-primary/20'} relative overflow-hidden`}>
                     <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-1">OTP Code</p>
                        <p className={`text-4xl font-black tracking-[0.2em] font-mono ${isExpired ? 'text-muted-foreground' : 'text-primary'}`}>
                          {token.token}
                        </p>
                     </div>
                     {!isExpired && (
                       <Key className="absolute -right-2 -bottom-2 h-16 w-16 text-primary/5 -rotate-12" />
                     )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-muted-foreground">
                      Generated {formatDistanceToNow(new Date(token.createdAt))} ago
                    </p>
                    <p className={`text-xs font-bold ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`}>
                      Exp: {new Date(token.expires).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && tokens.length > 0 && (
         <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex items-start gap-4">
            <ShieldAlert className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div>
               <h4 className="font-bold text-amber-500">Admin Security Protocol</h4>
               <p className="text-sm text-amber-700 font-medium">Please verify the user's identity before providing the code. Never share these codes with unauthorized individuals.</p>
            </div>
         </div>
      )}
    </div>
  );
}
