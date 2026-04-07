"use client";

import { useState, useEffect, useRef } from "react";
import {
  getCurrentUser,
  getConversations,
  getMessages,
  sendChatMessage,
  createConversation,
  syncMessageOwnership,
  getMessageOwnershipDiff,
  getUnreadConversationCounts,
  markConversationAsRead,
  updateConversationAlias,
  toggleConversationReadStatus,
} from "@/app/actions/messaging";
import { pusherClient } from "@/lib/pusher";
import { 
  Send, 
  Loader2, 
  User, 
  MessageCircle, 
  Plus, 
  Hash, 
  Clock, 
  Check, 
  CheckCheck, 
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Search,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useMessagingStore } from "@/store/use-messaging-store";

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [userNickname, setUserNickname] = useState("");
  const [adminNickname, setAdminNickname] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setUnreadCount: setGlobalUnreadCount } = useMessagingStore();

  // Load Initial Data (User & Conversations)
  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const convs = await getConversations();
        setConversations(convs);
        
        // Initial Unread Counts
        const unreadMap = await getUnreadConversationCounts(currentUser.email, currentUser.id);
        setUnreadCounts(unreadMap || {});
        setGlobalUnreadCount(Object.keys(unreadMap || {}).length);

        // Check for pending syncs
        const diff = await getMessageOwnershipDiff(currentUser.email, currentUser.id);
        setPendingSyncCount(diff.pendingCount || 0);

        if (convs.length > 0) {
          setActiveConvId(convs[0].id);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Subscribe to Global Notifications (for new conversations or updates)
  useEffect(() => {
    const channel = pusherClient.subscribe("admin-notifications");
    
    channel.bind("conversation-updated", (data: any) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.conversationId);
        let updated;
        if (idx === -1) {
          // If we want to handle completely new conversations from Admin side:
          return prev; 
        } else {
          updated = [...prev];
          updated[idx] = { 
            ...updated[idx], 
            updatedAt: data.lastMessage.createdAt ? new Date(data.lastMessage.createdAt) : new Date(),
            Message: [data.lastMessage]
          };
        }
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      
      const isExternalSender = data.lastMessage.senderId !== user?.id;
      if (isExternalSender) {
         if (activeConvId !== data.conversationId) {
            setUnreadCounts(prev => {
              const next = {
                ...prev,
                [data.conversationId]: (prev[data.conversationId] || 0) + 1
              };
              setGlobalUnreadCount(Object.keys(next).length);
              return next;
            });
         }
         toast.info(`New message in thread`);
      }
    });

    return () => {
      pusherClient.unsubscribe("admin-notifications");
    };
  }, [user]);

  // Load Messages for Active Conversation & Subscribe to it
  useEffect(() => {
    if (!activeConvId) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      const history = await getMessages(undefined, undefined, activeConvId);
      setMessages(history);
      setLoadingMessages(false);
    };

    loadMessages();

    // Subscribe to specific chat channel
    const channelName = `conversation-${activeConvId}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind("new-message", (data: any) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.id);
        if (exists) return prev;
        return [...prev, data];
      });
      
      // Also update conversations list updatedAt
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === activeConvId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = { ...updated[index], updatedAt: new Date(data.createdAt), Message: [data] };
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        return prev;
      });
    });

    // Mark as read when opening
    markConversationAsRead(activeConvId).then(() => {
       setUnreadCounts(prev => {
         const next = {...prev};
         delete next[activeConvId];
         setGlobalUnreadCount(Object.keys(next).length);
         return next;
       });
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [activeConvId, setConversations]);

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || sending || !activeConvId || !user) return;

    setSending(true);
    try {
      const res = await sendChatMessage(content, user.email, user.id, activeConvId);
      if (res.success && res.message) {
        // Message will be added via Pusher bind or locally for immediate feedback
        setMessages((prev) => [...prev, res.message]);
        setContent("");
      } else {
        toast.error("Failed to send message");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setSending(false);
    }
  };

  const handleCreateConv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const res = await createConversation(newTitle);
      if (res.success && res.conversation) {
        setConversations((prev) => [res.conversation, ...prev]);
        setActiveConvId(res.conversation.id);
        setNewTitle("");
        toast.success("New conversation started!");
      } else {
        toast.error("Failed to create conversation");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSync = async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      const res = await syncMessageOwnership(user.email, user.id);
      if (res.success) {
        const convs = await getConversations();
        setConversations(convs);
        setPendingSyncCount(0);
        toast.success(`${res.updatedCount} messages synchronized!`);
      }
    } catch (err) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateAlias = async () => {
    if (!activeConvId) return;
    const res = await updateConversationAlias(activeConvId, userNickname, adminNickname);
    if (res.success) {
      toast.success("Nicknames updated");
      setIsEditingAlias(false);
      setConversations(conversations.map(c => c.id === activeConvId ? { ...c, userAlias: userNickname, adminAlias: adminNickname } : c));
    } else {
      toast.error(res.error || "Update failed");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium tracking-tight">Initializing real-time chat...</p>
      </div>
    );
  }

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="flex gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-700 relative overflow-hidden">
      {/* Sidebar: Conversation List */}
      <div className={cn(
        "w-full md:w-96 flex flex-col bg-card border rounded-3xl shadow-xl overflow-hidden glassmorphism border-primary/10 transition-all duration-300",
        activeConvId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b bg-muted/20 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat Threads
            </h2>
            <Button size="icon" variant="ghost" className="rounded-full" onClick={handleSync} disabled={pendingSyncCount === 0 || syncing}>
               {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className={cn("h-4 w-4", pendingSyncCount > 0 && "text-primary animate-pulse")} />}
            </Button>
          </div>
          
          <form onSubmit={handleCreateConv} className="relative group">
            <Input 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New thread title..."
              className="rounded-2xl pl-10 pr-10 h-11 bg-background/50 border-primary/10 focus:border-primary/30 transition-all shadow-inner"
            />
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <button 
              type="submit" 
              disabled={!newTitle.trim() || isCreating}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-30 grayscale">
               <Hash className="h-12 w-12 mb-2" />
               <p className="text-sm font-medium">No conversations yet</p>
               <p className="text-[10px]">Start your first thread above!</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={cn(
                  "w-full text-left p-5 transition-all border-b border-primary/5 flex gap-4 group relative",
                  activeConvId === conv.id ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                {activeConvId === conv.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
                <div className={cn(
                   "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-sm",
                   activeConvId === conv.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {conv.title?.charAt(0) || "G"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold truncate tracking-tight">
                      {conv.title || "General Chat"}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                       {unreadCounts[conv.id] !== undefined && (
                         <span className={cn(
                           "flex items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse",
                           unreadCounts[conv.id] === -1 ? "h-2 w-2" : "h-4 min-w-4 px-1 text-[8px] font-black"
                         )}>
                           {unreadCounts[conv.id] !== -1 && unreadCounts[conv.id]}
                         </span>
                       )}
                       <span className="text-[10px] opacity-40 font-medium whitespace-nowrap">
                         {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                       </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate opacity-70 mt-0.5">
                     {conv.userAlias ? `[${conv.userAlias}] ` : ""}{conv.Message?.[0]?.content || "No messages yet"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-card border rounded-3xl shadow-xl overflow-hidden glassmorphism border-primary/10 transition-all duration-300",
        !activeConvId ? "hidden md:flex" : "flex"
      )}>
        {activeConvId ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b bg-muted/20 backdrop-blur-md">
              <div className="flex items-center gap-2 md:gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden rounded-2xl" 
                  onClick={() => setActiveConvId(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="h-10 w-10 md:h-14 md:w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Hash className="h-5 w-5 md:h-7 md:h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">{activeConv?.title || "Conversation"}</h2>
                    <button onClick={() => {
                      setUserNickname(activeConv?.userAlias || "");
                      setAdminNickname(activeConv?.adminAlias || "");
                      setIsEditingAlias(!isEditingAlias);
                    }} className="opacity-30 hover:opacity-100">
                      <User className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1.5 text-[10px] text-green-500 font-bold uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-full">
                       <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                       Real-time
                    </span>
                    <span className="text-[10px] opacity-40 font-medium">#{activeConvId.slice(-8)}</span>
                  </div>
                </div>
              </div>
              
              {isEditingAlias && (
                <div className="absolute right-20 top-6 z-50 bg-background border rounded-2xl shadow-2xl p-4 w-64 animate-in zoom-in-95">
                   <p className="text-[10px] font-bold uppercase tracking-widest mb-3 opacity-60">Nicknames</p>
                   <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-bold ml-1 mb-1">Your Nickname</label>
                        <Input value={userNickname} onChange={e => setUserNickname(e.target.value)} className="h-9 text-xs rounded-xl" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold ml-1 mb-1">Admin Nickname</label>
                        <Input value={adminNickname} onChange={e => setAdminNickname(e.target.value)} className="h-9 text-xs rounded-xl" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="h-8 flex-1 rounded-xl text-xs" onClick={handleUpdateAlias}>Save</Button>
                        <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => setIsEditingAlias(false)}>Cancel</Button>
                      </div>
                   </div>
                </div>
              )}

              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-2xl opacity-40 hover:opacity-100"
                onClick={async () => {
                  if (!activeConvId) return;
                  await toggleConversationReadStatus(activeConvId, false);
                  // Refresh unread counts
                  const map = await getUnreadConversationCounts();
                  setUnreadCounts(map || {});
                  setGlobalUnreadCount(Object.keys(map || {}).length);
                  // Exit detail view on mobile
                  if (window.innerWidth < 768) setActiveConvId(null);
                  toast.info("Marked as unread");
                }}
              >
                 <Clock className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-2xl opacity-40 hover:opacity-100">
                 <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Message List */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 bg-muted/5 custom-scrollbar"
            >
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-30">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-xs font-mono">Retrieving stream...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-20">
                  <MessageCircle className="h-16 w-16" />
                  <p className="text-sm font-semibold tracking-widest uppercase">Start of history</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.senderId === user.id || (msg.isAdmin && user.Role?.name === "Admin");
                  const showAvatar = idx === 0 || messages[idx-1].senderId !== msg.senderId;
                  
                  return (
                    <div 
                      key={msg.id}
                      className={cn(
                        "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
                        isMe ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-sm",
                        showAvatar ? (isMe ? "bg-primary text-primary-foreground" : "bg-muted border shadow-sm") : "opacity-0"
                      )}>
                        {isMe ? "ME" : (activeConv?.adminAlias?.charAt(0) || msg.User?.name?.charAt(0) || "?")}
                      </div>
                      <div className={cn(
                        "flex flex-col max-w-[70%]",
                        isMe ? "items-end" : "items-start"
                      )}>
                        {!isMe && (
                          <span className="text-[10px] font-bold mb-1 opacity-60">
                             {msg.sender?.name || (msg.isAdmin ? `Admin - ${activeConv?.adminAlias || msg.User?.name || "Support"}` : (activeConv?.userAlias || msg.User?.name || "User"))}
                          </span>
                        )}
                        <div className={cn(
                          "px-6 py-4 rounded-3xl text-sm leading-relaxed shadow-sm",
                          isMe 
                            ? "bg-primary text-primary-foreground rounded-tr-none" 
                            : "bg-background border rounded-tl-none"
                        )}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="mt-2 text-[10px] font-bold opacity-30 flex items-center gap-1.5 tracking-tighter">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe && <CheckCheck className="h-3 w-3 text-primary" />}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <div className="p-8 border-t bg-muted/20 backdrop-blur-xl">
              <form onSubmit={handleSend} className="relative flex items-center gap-4">
                <Input 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Collaborate in real-time..."
                  className="flex-1 rounded-2xl h-16 pl-8 pr-16 bg-background/80 border-primary/20 shadow-2xl focus:ring-primary/10 text-base"
                  disabled={sending}
                />
                <Button 
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="absolute right-3 h-12 w-12 rounded-xl transition-all active:scale-95 shadow-xl bg-primary hover:bg-primary/90"
                  size="icon"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12 text-center">
            <div className="h-24 w-24 rounded-[40px] bg-primary/10 flex items-center justify-center text-primary animate-bounce duration-[2000ms]">
               <MessageCircle className="h-12 w-12" />
            </div>
            <div className="space-y-2 max-w-sm">
               <h3 className="text-2xl font-bold tracking-tight">Select a conversation</h3>
               <p className="text-muted-foreground text-sm leading-relaxed">
                  Choose a thread from the sidebar or start a new one to begin real-time collaboration.
               </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/40">
               <Clock className="h-3 w-3" /> Waiting for interaction
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
