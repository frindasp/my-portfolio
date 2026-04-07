"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Loader2, User, LogIn, Link2, ChevronLeft, Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessagingStore, ConversationWithLastMessage } from "@/store/use-messaging-store";
import {
  getConversations,
  getMessages,
  sendChatMessage,
  createConversation,
  syncMessageOwnership,
  getMessageOwnershipDiff,
  getUnreadConversationCounts,
  markConversationAsRead,
  updateConversationAlias,
} from "@/app/actions/messaging";
import { pusherClient } from "@/lib/pusher";
import AuthOverlay from "./AuthOverlay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatWindow() {
  const { 
    messages, setMessages, addMessage, 
    conversations, setConversations, 
    activeConvId, setActiveConv,
    userId, userEmail, isRegistered, userName 
  } = useMessagingStore();
  const [userNickname, setUserNickname] = useState("");
  const [adminNickname, setAdminNickname] = useState("");
  const [isEditingAlias, setIsEditingAlias] = useState(false);

  const [content, setContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [syncingOwnership, setSyncingOwnership] = useState(false);
  const [ownershipDiffCount, setOwnershipDiffCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const baseTitleRef = useRef<string>("Coretan");
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load Initial Conversations & Ownership Diff
  useEffect(() => {
    if (typeof document !== "undefined") {
      baseTitleRef.current = document.title;
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      Promise.all([getConversations(), getUnreadConversationCounts()]).then(
        ([loadedConversations, unreadMap]) => {
          setConversations(loadedConversations as ConversationWithLastMessage[]);
          setUnreadCounts(unreadMap || {});
        },
      );
      
      if (userId) {
        getMessageOwnershipDiff(userEmail, userId).then((result) => {
          setOwnershipDiffCount(result.pendingCount);
        });
      }
    }
  }, [userEmail, userId, setConversations]);

  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    if (typeof document === "undefined") return;

    document.title =
      totalUnread > 0
        ? `(${totalUnread}) - ${baseTitleRef.current}`
        : baseTitleRef.current;
  }, [unreadCounts]);

  useEffect(() => {
    if (!activeConvId) return;

    markConversationAsRead(activeConvId).then(() => {
      setUnreadCounts((prev) => {
        if (!prev[activeConvId]) return prev;
        const next = { ...prev };
        delete next[activeConvId];
        return next;
      });
    });
  }, [activeConvId]);

  // Load Messages for Active Conversation & Subscribe Pusher
  useEffect(() => {
    const channel = pusherClient.subscribe("admin-notifications");

    channel.bind("conversation-updated", (data: any) => {
      if (!data?.conversationId || !data?.lastMessage) return;

      const idx = conversations.findIndex((conversation) => conversation.id === data.conversationId);
      if (idx !== -1) {
        const updated = [...conversations];
        updated[idx] = {
          ...updated[idx],
          updatedAt: data.lastMessage.createdAt || new Date().toISOString(),
          Message: [data.lastMessage],
        };
        const sorted = updated.sort(
          (a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setConversations(sorted);
      }

      const isAdminReply = !!data.lastMessage.isAdmin;
      if (isAdminReply && activeConvId !== data.conversationId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [data.conversationId]: (prev[data.conversationId] || 0) + 1,
        }));
      }
    });

    return () => {
      pusherClient.unsubscribe("admin-notifications");
    };
  }, [activeConvId, setConversations]);

  useEffect(() => {
    if (!activeConvId) return;

    const loadMessages = async () => {
      setLoadingHistory(true);
      const history = await getMessages(undefined, undefined, activeConvId);
      setMessages(history);
      setLoadingHistory(false);
    };

    loadMessages();

    // Pusher Subscription
    const channelName = `conversation-${activeConvId}`;
    const channel = pusherClient.subscribe(channelName);
    
    channel.bind("new-message", (data: any) => {
      addMessage(data);
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [activeConvId, setMessages, addMessage]);

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!content.trim() || sending || !activeConvId) return;

    setSending(true);
    try {
      const result = await sendChatMessage(content, userEmail || undefined, userId || undefined, activeConvId);
      if (result.success && result.message) {
        // Message added via Pusher bind (or locally if you want)
        setContent("");
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSending(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!newTitle.trim() || isCreating || !userEmail) return;

    setIsCreating(true);
    try {
      const res = await createConversation(newTitle);
      if (res.success && res.conversation) {
        // Need to add Message array to match ConversationWithLastMessage type
        setConversations([{ ...res.conversation, Message: [] }, ...conversations]);
        setActiveConv(res.conversation.id);
        setNewTitle("");
      } else {
        toast.error("Failed to start new thread");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncOwnership = async () => {
    if (!userEmail || !userId || syncingOwnership || ownershipDiffCount === 0) return;

    setSyncingOwnership(true);
    try {
      const result = await syncMessageOwnership(userEmail, userId);
      if (result.success) {
        setOwnershipDiffCount(0);
        const refreshed = await getConversations();
        setConversations(refreshed as ConversationWithLastMessage[]);
        toast.success(`${result.updatedCount} chat lama berhasil dipadankan`);
      } else {
        toast.error(result.error || "Gagal memadankan chat lama");
      }
    } catch (error) {
      toast.error("Gagal memadankan chat lama");
    } finally {
      setSyncingOwnership(false);
    }
  };

  const handleUpdateAlias = async () => {
    if (!activeConvId) return;
    try {
      const res = await updateConversationAlias(activeConvId, userNickname, adminNickname);
      if (res.success) {
        toast.success("Nicknames updated");
        setIsEditingAlias(false);
        // Update local state for conversations
        setConversations(conversations.map((c) => 
          c.id === activeConvId ? { ...c, userAlias: userNickname, adminAlias: adminNickname } : c
        ));
      }
    } catch (err) {
      toast.error("Failed to update nicknames");
    }
  };

  if (showAuth && !isRegistered) {
    return (
      <div className="relative h-full">
        <AuthOverlay onCancel={() => setShowAuth(false)} />
      </div>
    );
  }

  // --- RENDERING VIEWS ---

  // 1. Thread List View
  if (!activeConvId) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-4 border-b bg-card flex items-center justify-between shadow-sm">
           <h3 className="font-bold text-sm">Coretan Conversations</h3>
           {!isRegistered && (
             <Button variant="ghost" size="sm" onClick={() => setShowAuth(true)} className="text-[10px] h-8 px-2">
                <LogIn className="h-3.5 w-3.5 mr-1" /> Login
             </Button>
           )}
        </div>

        <div className="p-4 border-b bg-muted/20">
           <div className="relative flex gap-2">
              <Input 
                placeholder="New thread title..." 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateConversation()}
                className="text-xs h-9 rounded-xl pr-10"
                disabled={!userEmail && !isRegistered}
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg"
                onClick={handleCreateConversation}
                disabled={isCreating || !newTitle.trim() || (!userEmail && !isRegistered)}
              >
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
           </div>
           {!userEmail && !isRegistered && (
             <p className="mt-2 text-[10px] text-muted-foreground text-center">Identifying as guest or login to start.</p>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {conversations.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-30 p-8 text-center gap-2">
               <MessageCircle className="h-10 w-10" />
               <p className="text-xs">No active threads. Start one above!</p>
             </div>
           ) : (
             conversations.map((c: any) => (
               <button
                 key={c.id}
                 onClick={() => setActiveConv(c.id)}
                 className="w-full text-left p-3 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border group"
               >
                 <div className="flex justify-between items-start gap-2">
                    <p className="text-xs font-bold truncate tracking-tight">{c.title || "Support Thread"}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {unreadCounts[c.id] ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                          {unreadCounts[c.id]}
                        </span>
                      ) : null}
                      <span className="text-[9px] opacity-40">#{c.id.slice(-4)}</span>
                    </div>
                 </div>
                 {c.Message?.[0] && (
                   <p className="text-[10px] text-muted-foreground truncate opacity-70 mt-0.5 line-clamp-1 italic">
                     {c.Message[0].content}
                   </p>
                 )}
               </button>
             ))
           )}
        </div>
      </div>
    );
  }

  // 2. Active Chat View
  const activeConv = conversations.find((c: any) => c.id === activeConvId);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveConv(null)} className="rounded-full h-8 w-8 -ml-1">
             <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate max-w-[120px]">
                {activeConv?.title || "Support"}
              </h3>
              <button onClick={() => {
                setUserNickname(activeConv?.userAlias || "");
                setAdminNickname(activeConv?.adminAlias || "");
                setIsEditingAlias(!isEditingAlias);
              }} className="opacity-40 hover:opacity-100 transition-opacity">
                <User className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
               <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
               <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Real-time</p>
            </div>
          </div>
        </div>
        {!isRegistered && (
          <Button variant="ghost" size="sm" onClick={() => setShowAuth(true)} className="text-xs gap-1 h-8">
            <LogIn className="h-3 w-3" /> Login
          </Button>
        )}
      </div>

      {/* Alias Editor Overlay */}
      {isEditingAlias && (
        <div className="p-4 bg-muted/30 border-b animate-in slide-in-from-top duration-300">
           <p className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-60">Conversation Nicknames</p>
           <div className="space-y-2">
             <div className="flex flex-col gap-1">
               <label className="text-[9px] font-medium ml-1">Your Alias (User)</label>
               <Input 
                 placeholder="Set your nickname..." 
                 value={userNickname} 
                 onChange={(e) => setUserNickname(e.target.value)}
                 className="h-8 text-[11px] rounded-lg"
               />
             </div>
             <div className="flex flex-col gap-1">
               <label className="text-[9px] font-medium ml-1">Admin's Alias</label>
               <Input 
                 placeholder="Set admin's nickname..." 
                 value={adminNickname} 
                 onChange={(e) => setAdminNickname(e.target.value)}
                 className="h-8 text-[11px] rounded-lg"
               />
             </div>
             <div className="flex gap-2 pt-1">
               <Button size="sm" className="h-7 text-[10px] flex-1 rounded-lg" onClick={handleUpdateAlias}>Save</Button>
               <Button size="sm" variant="ghost" className="h-7 text-[10px] rounded-lg" onClick={() => setIsEditingAlias(false)}>Cancel</Button>
             </div>
           </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-muted/[0.02]"
      >
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
             <Loader2 className="h-5 w-5 animate-spin" />
             <p className="text-[10px] font-mono tracking-tighter">Connecting to history stream...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30 px-6">
            <div className="p-3 bg-muted rounded-full">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">New thread started.</p>
              <p className="text-[10px]">Type below to begin chatting!</p>
            </div>
          </div>
        ) : (
          messages.map((msg: any) => (
            <div 
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-sm transition-all animate-in fade-in duration-500",
                msg.senderId === userId || msg.senderEmail === userEmail
                  ? "self-end bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/10"
                  : "self-start bg-background text-foreground rounded-tl-none border shadow-sm"
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <span className="mt-1.5 text-[9px] opacity-50 self-end font-mono">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Login Nudge */}
      {!isRegistered && userEmail && (
        <div className="px-4 py-2 bg-primary/5 text-[10px] text-center text-primary/80 border-t border-t-primary/10">
          Chatting as <strong>{userEmail}</strong>. <button onClick={() => setShowAuth(true)} className="underline font-bold">Register</button> to preserve history.
        </div>
      )}

      {isRegistered && userEmail && userId && ownershipDiffCount > 0 && !activeConvId && (
        <div className="px-4 py-2 bg-amber-500/10 text-[10px] text-center text-amber-700 border-t border-t-amber-500/20">
          Ditemukan <strong>{ownershipDiffCount}</strong> chat lama belum ditandai.
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSyncOwnership}
            disabled={syncingOwnership}
            className="ml-2 h-6 px-2 text-[10px]"
          >
            {syncingOwnership ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />} Padankan
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <div className="relative flex items-center gap-2">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 pr-12 rounded-2xl bg-background border-primary/20 focus-visible:ring-primary/20 h-11 text-sm shadow-inner"
            disabled={sending}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleSendMessage}
            disabled={sending || !content.trim()}
            className="absolute right-1 h-9 w-9 rounded-xl text-primary hover:text-primary hover:bg-primary/10 active:scale-95 transition-all"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
