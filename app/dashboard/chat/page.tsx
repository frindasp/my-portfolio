"use client";

import { useState, useEffect, useRef } from "react";
import {
  getCurrentUser,
  getConversations,
  getMessages,
  sendChatMessage,
  createConversation,
  getUnreadConversationCounts,
  markConversationAsRead,
  updateConversationAlias,
  toggleConversationReadStatus,
  toggleConversationPinnedStatus,
  toggleConversationFavoriteStatus,
  toggleConversationArchivedStatus,
  toggleConversationMutedStatus,
  clearConversationMessages,
  deleteConversation,
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
  CheckCheck, 
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Search,
  MoreVertical,
  Pin,
  Star,
  Archive,
  VolumeX,
  CheckCircle2,
  Trash2,
  Eraser,
  PinOff,
  Bell,
  StarOff,
  ArchiveRestore,
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [userNickname, setUserNickname] = useState("");
  const [adminNickname, setAdminNickname] = useState("");
  const [filterTab, setFilterTab] = useState("all"); 
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setUnreadCount: setGlobalUnreadCount } = useMessagingStore();

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const convs = await getConversations();
        setConversations(convs);
        const unreadMap = await getUnreadConversationCounts(currentUser.email, currentUser.id);
        setUnreadCounts(unreadMap || {});
        const total = (Object.values(unreadMap || {}) as number[]).reduce((acc: number, val: number) => acc + (val > 0 ? val : 0), 0);
        setGlobalUnreadCount(total);
        if (convs.length > 0) setActiveConvId(convs[0].id);
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const channel = pusherClient.subscribe("admin-notifications");
    channel.bind("conversation-updated", (data: any) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === data.conversationId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { 
          ...updated[idx], 
          updatedAt: data.lastMessage.createdAt ? new Date(data.lastMessage.createdAt) : new Date(),
          Message: [data.lastMessage]
        };
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      if (data.lastMessage.senderId !== user?.id && activeConvId !== data.conversationId) {
        setUnreadCounts(prev => {
          const next = { ...prev, [data.conversationId]: (prev[data.conversationId] || 0) + 1 };
          const total = (Object.values(next) as number[]).reduce((acc: number, val: number) => acc + (val > 0 ? val : 0), 0);
          setGlobalUnreadCount(total);
          return next;
        });
        toast.info(`New message in thread`);
      }
    });
    return () => { pusherClient.unsubscribe("admin-notifications"); };
  }, [user, activeConvId]);

  useEffect(() => {
    if (!activeConvId) return;
    const loadMessages = async () => {
      setLoadingMessages(true);
      const history = await getMessages(undefined, undefined, activeConvId);
      setMessages(history);
      setLoadingMessages(false);
    };
    loadMessages();
    const channelName = `conversation-${activeConvId}`;
    const channel = pusherClient.subscribe(channelName);
    channel.bind("new-message", (data: any) => {
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === activeConvId);
        if (index === -1) return prev;
        const updated = [...prev];
        updated[index] = { ...updated[index], updatedAt: new Date(data.createdAt), Message: [data] };
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    });
    markConversationAsRead(activeConvId).then(() => {
       setUnreadCounts(prev => {
         const next = {...prev};
         delete next[activeConvId];
         const total = (Object.values(next) as number[]).reduce((acc: number, val: number) => acc + (val > 0 ? val : 0), 0);
         setGlobalUnreadCount(total);
         return next;
       });
    });
    return () => { pusherClient.unsubscribe(channelName); };
  }, [activeConvId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || sending || !activeConvId || !user) return;
    setSending(true);
    try {
      const res = await sendChatMessage(content, user.email, user.id, activeConvId);
      if (res.success && res.message) {
        setMessages(prev => [...prev, res.message]);
        setContent("");
      }
    } catch (err) { toast.error("An error occurred"); }
    finally { setSending(false); }
  };

  const handleCreateConv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const res = await createConversation(newTitle);
      if (res.success && res.conversation) {
        setConversations(prev => [res.conversation, ...prev]);
        setActiveConvId(res.conversation.id);
        setNewTitle("");
        toast.success("New conversation started!");
      }
    } catch (err) { toast.error("An error occurred"); }
    finally { setIsCreating(false); }
  };



  const handleUpdateAlias = async () => {
    if (!activeConvId) return;
    const res = await updateConversationAlias(activeConvId, userNickname, adminNickname);
    if (res.success) {
      toast.success("Nicknames updated");
      setIsEditingAlias(false);
      setConversations(conversations.map(c => c.id === activeConvId ? { ...c, userAlias: userNickname, adminAlias: adminNickname } : c));
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    const res = await toggleConversationPinnedStatus(id, !isPinned);
    if (res.success) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isPinned: !isPinned } } : c));
      toast.success(!isPinned ? "Chat pinned" : "Chat unpinned");
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    const res = await toggleConversationFavoriteStatus(id, !isFavorite);
    if (res.success) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isFavorite: !isFavorite } } : c));
      toast.success(!isFavorite ? "Added to favorites" : "Removed from favorites");
    }
  };

  const handleToggleArchive = async (id: string, isArchived: boolean) => {
    const res = await toggleConversationArchivedStatus(id, !isArchived);
    if (res.success) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isArchived: !isArchived } } : c));
      toast.success(!isArchived ? "Chat archived" : "Chat restored");
    }
  };

  const handleToggleMute = async (id: string, isMuted: boolean) => {
    const res = await toggleConversationMutedStatus(id, !isMuted);
    if (res.success) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isMuted: !isMuted } } : c));
      toast.success(!isMuted ? "Notifications muted" : "Notifications unmuted");
    }
  };

  const handleToggleRead = async (id: string, isRead: boolean) => {
    const res = await toggleConversationReadStatus(id, !isRead);
    if (res.success) {
      setUnreadCounts(prev => {
        const next = { ...prev };
        if (!isRead) next[id] = -1; else delete next[id];
        return next;
      });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isRead: !isRead } } : c));
      toast.success(!isRead ? "Marked as unread" : "Marked as read");
    }
  };

  const handleClear = async (id: string) => {
    if (!confirm("Clear all messages?")) return;
    const res = await clearConversationMessages(id);
    if (res.success) {
      if (activeConvId === id) setMessages([]);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, Message: [] } : c));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete entire conversation?")) return;
    const res = await deleteConversation(id);
    if (res.success) {
      if (activeConvId === id) setActiveConvId(null);
      setConversations(prev => prev.filter(c => c.id !== id));
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (filterTab === "unread") return unreadCounts[c.id] !== undefined || !c.userState?.isRead;
    if (filterTab === "favorite") return c.userState?.isFavorite;
    if (filterTab === "archive") return c.userState?.isArchived;
    if (filterTab === "muted") return c.userState?.isMuted;
    if (filterTab !== "archive" && c.userState?.isArchived) return false;
    return true;
  }).sort((a, b) => {
    if (a.userState?.isPinned && !b.userState?.isPinned) return -1;
    if (!a.userState?.isPinned && b.userState?.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Initializing...</p>
      </div>
    );
  }

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="flex gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-700 relative overflow-hidden">
      <div className={cn(
        "w-full md:w-96 flex flex-col bg-card border rounded-3xl shadow-xl overflow-hidden glassmorphism border-primary/10 transition-all duration-300",
        activeConvId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b bg-muted/20 space-y-4">
           <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> Threads
            </h2>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => {}} disabled={true}>
               <RefreshCw className="h-3 w-3 opacity-20" />
            </Button>
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl overflow-x-auto no-scrollbar">
            {['all', 'unread', 'favorite', 'archive', 'muted', 'group'].map((t) => (
              <button key={t} onClick={() => setFilterTab(t)} className={cn(
                "whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all",
                filterTab === t ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
                {t === 'unread' ? `Belum dibaca ${Object.keys(unreadCounts).length || ''}` : t === 'all' ? 'Semua' : t === 'favorite' ? 'Favorit' : t === 'archive' ? 'Arsip' : t === 'muted' ? 'Dibisukan' : 'Grup'}
              </button>
            ))}
          </div>
          <form onSubmit={handleCreateConv} className="relative group">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New thread title..." className="rounded-xl pl-9 pr-9 h-10 bg-background/50 text-xs" />
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <button type="submit" disabled={!newTitle.trim() || isCreating} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"><ChevronRight className="h-4 w-4" /></button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-30 italic text-xs">No threads found</div>
          ) : (
            filteredConversations.map((conv) => (
              <div key={conv.id} className="relative group border-b border-primary/5">
                <button onClick={() => setActiveConvId(conv.id)} className={cn(
                  "w-full text-left p-4 transition-all flex gap-3 relative",
                  activeConvId === conv.id ? "bg-primary/5" : "hover:bg-muted/30"
                )}>
                  {activeConvId === conv.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                  <div className={cn(
                     "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 relative",
                     activeConvId === conv.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {conv.title?.charAt(0) || "G"}
                    {conv.userState?.isMuted && <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border"><VolumeX className="h-2 w-2 text-muted-foreground" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                       <div className="flex items-center gap-1 min-w-0">
                          {conv.userState?.isPinned && <Pin className="h-3 w-3 text-primary shrink-0 rotate-45" />}
                          <p className="text-xs font-bold truncate">{conv.title || "Chat"}</p>
                       </div>
                       <span className="text-[9px] opacity-40 font-medium whitespace-nowrap">{formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                       <p className="text-[10px] text-muted-foreground truncate flex-1 opacity-70">
                          {conv.userAlias ? `[${conv.userAlias}] ` : ""}{conv.Message?.[0]?.content || "..."}
                       </p>
                       {unreadCounts[conv.id] !== undefined && (
                         <span className={cn("flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-black h-4 min-w-4 px-1", unreadCounts[conv.id] === -1 && "h-2 w-2 p-0")}>
                           {unreadCounts[conv.id] !== -1 && unreadCounts[conv.id]}
                         </span>
                       )}
                    </div>
                  </div>
                </button>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl glassmorphism">
                      <DropdownMenuItem onClick={() => handleToggleArchive(conv.id, !!conv.userState?.isArchived)} className="gap-2 text-xs">
                        {conv.userState?.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />} {conv.userState?.isArchived ? "Unarchive" : "Archive"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePin(conv.id, !!conv.userState?.isPinned)} className="gap-2 text-xs">
                        {conv.userState?.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} {conv.userState?.isPinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleRead(conv.id, !!conv.userState?.isRead)} className="gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {conv.userState?.isRead ? "Unread" : "Read"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleFavorite(conv.id, !!conv.userState?.isFavorite)} className="gap-2 text-xs">
                        <Star className={cn("h-3.5 w-3.5", conv.userState?.isFavorite && "fill-primary")} /> {conv.userState?.isFavorite ? "Hapus Favorit" : "Favorit"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleMute(conv.id, !!conv.userState?.isMuted)} className="gap-2 text-xs">
                        {conv.userState?.isMuted ? <Bell className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} {conv.userState?.isMuted ? "Bunyikan" : "Bisukan"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleClear(conv.id)} className="gap-2 text-xs text-warning"><Eraser className="h-3.5 w-3.5" /> Clear</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(conv.id)} className="gap-2 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={cn("flex-1 flex flex-col bg-card border rounded-3xl shadow-xl overflow-hidden glassmorphism border-primary/10 transition-all", !activeConvId ? "hidden md:flex" : "flex")}>
        {activeConvId ? (
          <>
            <div className="flex items-center justify-between p-4 border-b bg-muted/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveConvId(null)}><ChevronLeft className="h-5 w-5" /></Button>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Hash className="h-5 w-5" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold">{activeConv?.title || "Chat"}</h2>
                    <button onClick={() => { setUserNickname(activeConv?.userAlias || ""); setAdminNickname(activeConv?.adminAlias || ""); setIsEditingAlias(!isEditingAlias); }} className="opacity-30 hover:opacity-100"><User className="h-3 w-3" /></button>
                  </div>
                  <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest mt-0.5">Real-time Active</p>
                </div>
              </div>
              {isEditingAlias && (
                <div className="absolute right-4 top-16 z-50 bg-background border rounded-xl shadow-2xl p-4 w-56 animate-in slide-in-from-top-2">
                   <p className="text-[9px] font-bold uppercase opacity-50 mb-3">Nicknames</p>
                   <div className="space-y-3">
                      <Input value={userNickname} onChange={e => setUserNickname(e.target.value)} placeholder="User Alias" className="h-8 text-xs" />
                      <Input value={adminNickname} onChange={e => setAdminNickname(e.target.value)} placeholder="Admin Alias" className="h-8 text-xs" />
                      <div className="flex gap-2"><Button size="sm" className="h-7 text-[10px] flex-1" onClick={handleUpdateAlias}>Save</Button><Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setIsEditingAlias(false)}>Cancel</Button></div>
                   </div>
                </div>
              )}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-muted/5 custom-scrollbar">
              {loadingMessages ? (<div className="flex flex-col items-center justify-center h-full opacity-30 gap-2"><Loader2 className="h-5 w-5 animate-spin" /><p className="text-[10px]">Loading...</p></div>) : 
               messages.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-center opacity-10"><MessageCircle className="h-12 w-12 mb-2" /><p className="text-xs font-bold uppercase tracking-widest">Start Chatting</p></div>) : 
               messages.map((msg, idx) => {
                  const isMe = msg.senderId === user.id || (msg.isAdmin && user.Role?.name === "Admin");
                  return (
                    <div key={msg.id} className={cn("flex gap-3 animate-in fade-in duration-300", isMe ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold transition-all", isMe ? "bg-primary text-primary-foreground" : "bg-muted shadow-sm")}>{isMe ? "ME" : (activeConv?.adminAlias?.charAt(0) || msg.User?.name?.charAt(0) || "?")}</div>
                      <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
                        <div className={cn("px-4 py-3 rounded-2xl text-[13px] leading-snug shadow-sm", isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-background border rounded-tl-none")}><p className="whitespace-pre-wrap">{msg.content}</p></div>
                        <span className="mt-1 text-[9px] font-bold opacity-30">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
            <div className="p-4 md:p-6 border-t bg-muted/10">
              <form onSubmit={handleSend} className="relative flex items-center gap-3">
                <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-xl h-12 pr-12 bg-background/50 border-primary/20 text-sm" disabled={sending} />
                <Button type="submit" disabled={sending || !content.trim()} className="absolute right-2 h-9 w-9 rounded-lg" size="icon">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center opacity-30">
            <MessageCircle className="h-12 w-12 animate-pulse" />
            <div className="space-y-1"><h3 className="text-lg font-bold">Select a thread</h3><p className="text-xs">Or start a new conversation on the sidebar</p></div>
          </div>
        )}
      </div>
    </div>
  );
}
