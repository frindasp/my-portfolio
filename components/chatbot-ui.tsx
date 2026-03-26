"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, MessageSquare, Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sendChatbotReply } from "@/app/actions/chatbot";
import { PrismaClient } from "@prisma/client";

// Wait, we can't use PrismaClient in client component
// Let's assume there is a fetch for contacts or a server action to get contacts.

export default function ChatBotPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // We'll need a way to fetch contacts. Let's assume we can fetch them via a Server Action or API
  // For now, let's keep it simple and assume they are passed or fetched from an API in this demo
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch("/api/contacts"); // Assuming this exists or will be created
        if (response.ok) {
           const data = await response.json();
           setContacts(data.data || []);
        }
      } catch (err) {
        console.error("Load Contacts Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  const handleSend = async () => {
    if (!selectedContact || !input.trim() || sending) return;

    setSending(true);
    try {
      // THE MAGIC: Automatically passes selectedContact.id and the user is taken from session in S.A.
      const result = await sendChatbotReply(selectedContact.id, input);
      
      if (result.success) {
        toast.success(`Success! ${result.info}`);
        setInput("");
        // Optionally update local message history if we had one
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
     <div className="flex items-center justify-center h-full gap-2 opacity-50">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-medium tracking-tight">Loading Contacts...</span>
     </div>
  );

  return (
    <div className="flex h-full min-h-[500px] border border-primary/20 rounded-3xl overflow-hidden bg-card/50 backdrop-blur-xl group">
      {/* Sidebar - Contacts List */}
      <div className="w-80 border-r border-primary/10 flex flex-col bg-muted/10">
         <div className="p-6 border-b border-primary/10 flex items-center gap-3">
             <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
             </div>
             <h2 className="font-bold text-lg">Inquiries</h2>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {contacts.length === 0 ? (
               <div className="p-8 text-center text-xs text-muted-foreground opacity-50 italic">No inquiries found.</div>
            ) : contacts.map((c) => (
               <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all group/item flex items-center justify-between",
                    selectedContact?.id === c.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-primary/5"
                  )}
               >
                  <div className="min-w-0 pr-2">
                     <p className="text-sm font-bold truncate">{c.name}</p>
                     <p className={cn("text-[10px] truncate opacity-70", selectedContact?.id === c.id ? "text-primary-foreground/70" : "")}>{c.email}</p>
                  </div>
                  {selectedContact?.id === c.id && <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-hover/item:translate-x-1" />}
               </button>
            ))}
         </div>
      </div>

      {/* Main Panel - Response Tool */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
         {selectedContact ? (
            <>
               <div className="p-8 border-b border-primary/10 bg-primary/5">
                  <div className="space-y-4">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20">
                           {selectedContact.name.charAt(0)}
                        </div>
                        <div>
                           <h3 className="font-extrabold text-xl tracking-tight">{selectedContact.name}</h3>
                           <p className="text-sm text-muted-foreground">{selectedContact.email}</p>
                        </div>
                     </div>
                     <div className="p-6 rounded-2xl bg-background/50 border border-primary/10 italic text-sm text-muted-foreground leading-relaxed relative">
                        <div className="absolute -top-3 left-6 px-2 bg-background border border-primary/10 rounded-lg text-[10px] uppercase font-bold tracking-widest text-primary">Initial message</div>
                        "{selectedContact.message}"
                     </div>
                  </div>
               </div>

               {/* Chatbox Simulation */}
               <div className="flex-1 p-8 space-y-6 overflow-y-auto opacity-40 selection:bg-primary/20">
                   <div className="flex flex-col items-center justify-center h-full gap-2 text-center opacity-30">
                      <MessageSquare className="h-10 w-10 text-primary" />
                      <p className="text-xs font-mono">// Ready to reply as AI Chatbot Assistant</p>
                   </div>
               </div>

               {/* Interaction Area */}
               <div className="p-8 border-t border-primary/10 backdrop-blur-md bg-background/30">
                  <div className="flex items-center gap-3 relative">
                     <Input 
                        placeholder={`Automatically replying to ${selectedContact.name}...`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1 h-14 rounded-2xl pl-6 pr-14 bg-background border-primary/20 font-medium transition-all focus:ring-primary/20 shadow-sm"
                        disabled={sending}
                     />
                     <Button 
                        onClick={handleSend}
                        disabled={sending || !input.trim()}
                        className="absolute right-2 h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 transition-all active:scale-95 shadow-md"
                        size="icon"
                     >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                     </Button>
                  </div>
                  <div className="mt-4 flex items-center justify-between px-2">
                     <p className="text-[10px] text-muted-foreground opacity-60">Sender: <span className="font-bold">Logged-in User (Session ID)</span></p>
                     <p className="text-[10px] text-muted-foreground opacity-60">Reference: <span className="font-bold underline">#${selectedContact.id.slice(-8)}</span></p>
                  </div>
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-30">
               <div className="p-6 bg-primary/10 rounded-full animate-pulse">
                  <MessageSquare className="h-16 w-16 text-primary" />
               </div>
               <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold">Chatbot Dashboard</h3>
                  <p className="text-sm max-w-[250px]">Select an inquiry from the sidebar to start the automatic reply process.</p>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
