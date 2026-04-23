"use client";
  
import { useEffect, useState, useRef } from "react";
  
import { 
  Send, 
  Loader2, 
  User, 
  LogIn, 
  Link2, 
  ChevronLeft, 
  Plus, 
  MessageCircle,
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
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useMessagingStore, ConversationWithLastMessage } from "@/store/use-messaging-store";
import {
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
  createAnonymousUser,
  markMessageStatus,
  notifyTyping,
  updateUserStatus,
} from "@/app/actions/messaging";
import { pusherClient } from "@/lib/pusher";
import AuthOverlay from "./AuthOverlay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

import React from "react";

export default function ChatWindow(): React.ReactElement | null {
  const { 
    messages, setMessages, addMessage, 
    conversations, setConversations, 
    activeConvId, setActiveConv,
    userId, userEmail, isRegistered, userName, guestSessionId,
    isAnonymous, messageCount, setAnonymousUser, incrementMessageCount
  } = useMessagingStore();
  
  const [userNickname, setUserNickname] = useState("");
  const [adminNickname, setAdminNickname] = useState("");
  const [isEditingAlias, setIsEditingAlias] = useState(false);

  const [content, setContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [filterTab, setFilterTab] = useState("all"); 
  const baseTitleRef = useRef<string>("Coretan");
  
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { isOnline: boolean; lastSeen: string }>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      baseTitleRef.current = document.title;
    }
  }, []);

  useEffect(() => {
    const emailToUse = userEmail || (guestSessionId ? `${guestSessionId}@guest.com` : null);
    if (emailToUse) {
      Promise.all([
        getConversations(emailToUse, userId || guestSessionId || undefined), 
        getUnreadConversationCounts(emailToUse, userId || guestSessionId || undefined)
      ]).then(
        ([loadedConversations, unreadMap]) => {
          setConversations(loadedConversations as ConversationWithLastMessage[]);
          setUnreadCounts(unreadMap || {});
        },
      );
    }
  }, [userEmail, userId, guestSessionId, setConversations]);

  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + (count > 0 ? count : 0), 0);
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

  useEffect(() => {
    const channel = pusherClient.subscribe("admin-notifications");

    channel.bind("conversation-updated", (data: { conversationId: string; lastMessage: any }) => {
      if (!data?.conversationId || !data?.lastMessage) return;

      const idx = conversations.findIndex((conversation) => conversation.id === data.conversationId);
      if (idx !== -1) {
        const updated = [...conversations];
        updated[idx] = {
          ...updated[idx],
          updatedAt: data.lastMessage.createdAt ? new Date(data.lastMessage.createdAt) : new Date(),
          Message: [data.lastMessage],
        };
        const sorted = updated.sort(
          (a, b) =>
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

    const statusChannel = pusherClient.subscribe("user-status");
    statusChannel.bind("status-changed", (data: { userId: string; isOnline: boolean; lastSeen: string }) => {
      setOnlineUsers(prev => ({
        ...prev,
        [data.userId]: { isOnline: data.isOnline, lastSeen: data.lastSeen }
      }));
    });

    // Notify online
    updateUserStatus(true);

    return () => {
      pusherClient.unsubscribe("admin-notifications");
      pusherClient.unsubscribe("user-status");
      updateUserStatus(false);
    };
  }, [activeConvId, setConversations, conversations]);

  useEffect(() => {
    if (!activeConvId) return;

    const loadMessages = async () => {
      setLoadingHistory(true);
      const history = await getMessages(undefined, undefined, activeConvId);
      setMessages(history);
      setLoadingHistory(false);
    };

    loadMessages();

    const channelName = `conversation-${activeConvId}`;
    const channel = pusherClient.subscribe(channelName);
    
    channel.bind("new-message", (data: any) => {
      addMessage(data);
      // Mark as delivered if we are the recipient
      if (data.senderId !== userId && data.isAdmin) {
        markMessageStatus(data.id, "DELIVERED");
      }
    });

    channel.bind("user-typing", (data: { userId: string; userName: string; conversationId: string }) => {
      if (data.userId === userId) return;
      setTypingUsers(prev => {
        const current = prev[data.conversationId] || [];
        if (current.includes(data.userName)) return prev;
        return { ...prev, [data.conversationId]: [...current, data.userName] };
      });
    });

    channel.bind("user-stop-typing", (data: { userId: string; userName: string; conversationId: string }) => {
      setTypingUsers(prev => {
        const current = prev[data.conversationId] || [];
        return { ...prev, [data.conversationId]: current.filter(n => n !== data.userName) };
      });
    });

    channel.bind("message-status-updated", (data: { messageId: string; status: "SENT" | "DELIVERED" | "READ" }) => {
      setMessages(messages.map(m => m.id === data.messageId ? { ...m, status: data.status } : m));
    });

    channel.bind("conversation-status-updated", (data: { conversationId: string; status: "SENT" | "DELIVERED" | "READ" }) => {
      setMessages(messages.map(m => m.status !== "READ" ? { ...m, status: data.status } : m));
    });

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [activeConvId, setMessages, addMessage, userId, messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isRegistered && messageCount >= 3) {
      setShowAuth(true);
    }
  }, [isRegistered, messageCount]);

  const handleSendMessage = async () => {
    if (!content.trim() || sending) return;

    // Limit check for anonymous users
    if (!isRegistered && messageCount >= 3) {
      setShowAuth(true);
      return;
    }

    setSending(true);
    try {
      let currentUserId = userId;
      let emailToUse = userEmail;

      // Create anonymous user if not registered and no userId
      if (!isRegistered && !currentUserId) {
        const res = await createAnonymousUser();
        if (res.success && res.userId) {
          setAnonymousUser(res.userId);
          currentUserId = res.userId;
        } else {
          toast.error("Failed to start session");
          setSending(false);
          return;
        }
      }

      // If no active conversation, we need to create or find one
      let actualConvId = activeConvId;
      if (!actualConvId) {
        // Find existing conversation for this user if any
         const loadedConversations = await getConversations(emailToUse || undefined, currentUserId || undefined);
         if (loadedConversations.length > 0) {
           actualConvId = loadedConversations[0].id;
           setActiveConv(actualConvId);
         }
      }

      const result = await sendChatMessage(content, emailToUse || undefined, currentUserId || undefined, actualConvId || undefined);
      
      if (result.success && result.message) {
        setContent("");
        incrementMessageCount();
        
        // If it was a new conversation, set it as active
        if (!actualConvId && result.message.conversationId) {
          setActiveConv(result.message.conversationId);
          // Refresh conversations
          const email = userEmail || (guestSessionId ? `${guestSessionId}@guest.com` : undefined);
          getConversations(email, currentUserId || undefined).then(setConversations);
        }
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("An error occurred");
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (val: string) => {
    setContent(val);
    if (!activeConvId) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    notifyTyping(activeConvId, true);
    typingTimeoutRef.current = setTimeout(() => {
      notifyTyping(activeConvId, false);
    }, 3000);
  };

  const handleCreateConversation = async () => {
    if (!newTitle.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const res = await createConversation(newTitle);
      if (res.success && res.conversation) {
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

  const handleUpdateAlias = async () => {
    if (!activeConvId) return;
    try {
      const res = await updateConversationAlias(activeConvId, userNickname, adminNickname);
      if (res.success) {
        toast.success("Nicknames updated");
        setIsEditingAlias(false);
        setConversations(conversations.map((c) => 
          c.id === activeConvId ? { ...c, userAlias: userNickname, adminAlias: adminNickname } : c
        ));
      }
    } catch (err) {
      toast.error("Failed to update nicknames");
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    const res = await toggleConversationPinnedStatus(id, !isPinned);
    if (res.success) {
      setConversations(conversations.map(c => c.id === id ? { ...c, userState: { ...c.userState, isPinned: !isPinned } } : c) as any);
      toast.success(!isPinned ? "Chat disematkan" : "Batal sematkan");
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    const res = await toggleConversationFavoriteStatus(id, !isFavorite);
    if (res.success) {
      setConversations(conversations.map(c => c.id === id ? { ...c, userState: { ...c.userState, isFavorite: !isFavorite } } : c) as any);
      toast.success(!isFavorite ? "Tambah ke favorit" : "Hapus dari favorit");
    }
  };

  const handleToggleArchive = async (id: string, isArchived: boolean) => {
    const res = await toggleConversationArchivedStatus(id, !isArchived);
    if (res.success) {
      setConversations(conversations.map(c => c.id === id ? { ...c, userState: { ...c.userState, isArchived: !isArchived } } : c) as any);
      toast.success(!isArchived ? "Chat diarsipkan" : "Chat dikeluarkan dari arsip");
    }
  };

  const handleToggleMute = async (id: string, isMuted: boolean) => {
    const res = await toggleConversationMutedStatus(id, !isMuted);
    if (res.success) {
      setConversations(conversations.map(c => c.id === id ? { ...c, userState: { ...c.userState, isMuted: !isMuted } } : c) as any);
      toast.success(!isMuted ? "Notifikasi dibisukan" : "Notifikasi dibunyikan");
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
      setConversations(conversations.map(c => c.id === id ? { ...c, userState: { ...c.userState, isRead: !isRead } } : c) as any);
      toast.success(!isRead ? "Tandai belum dibaca" : "Tandai sudah dibaca");
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (filterTab === "unread") return unreadCounts[c.id] !== undefined || !c.userState?.isRead;
    if (filterTab === "favorite") return c.userState?.isFavorite;
    if (filterTab === "archive") return c.userState?.isArchived;
    if (filterTab === "muted") return c.userState?.isMuted;
    if (filterTab !== "archive" && c.userState?.isArchived) return false;
    return true;
  }).sort((a: any, b: any) => {
    if (a.userState?.isPinned && !b.userState?.isPinned) return -1;
    if (!a.userState?.isPinned && b.userState?.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (showAuth && (!isRegistered || (isAnonymous && messageCount >= 3))) {
    return (
      <div className="relative h-full">
        <AuthOverlay onCancel={() => setShowAuth(false)} />
      </div>
    );
  }

  if (!activeConvId) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-3 border-b bg-muted/20 space-y-3">
           <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg overflow-x-auto no-scrollbar">
            {['all', 'unread', 'favorite', 'archive', 'muted'].map((t) => (
              <button key={t} onClick={() => setFilterTab(t)} className={cn(
                "whitespace-nowrap px-2.5 py-1 rounded-md text-[9px] font-bold capitalize transition-all",
                filterTab === t ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
                {t === 'unread' ? `Belum dibaca ${Object.keys(unreadCounts).length || ''}` : t === 'all' ? 'Semua' : t === 'favorite' ? 'Favorit' : t === 'archive' ? 'Arsip' : 'Dibisukan'}
              </button>
            ))}
          </div>
           <div className="relative flex gap-2">
              <Input 
                placeholder="Judul obrolan baru..." 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateConversation()}
                className="text-xs h-8 rounded-lg pr-8"
                disabled={!userEmail && !isRegistered}
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-lg h-7 w-7"
                onClick={handleCreateConversation}
                disabled={isCreating || !newTitle.trim() || (!userEmail && !guestSessionId)}
              >
                {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
           {filteredConversations.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-30 p-8 text-center gap-2">
               <MessageCircle className="h-10 w-10" />
               <p className="text-[10px]">Tidak ada obrolan ditemukan.</p>
             </div>
           ) : (
             filteredConversations.map((c: any) => (
               <div key={c.id} className="relative group">
                <button
                  onClick={() => setActiveConv(c.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all border border-transparent flex gap-3",
                    activeConvId === c.id ? "bg-primary/5" : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                     "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 relative",
                     activeConvId === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {c.title?.charAt(0) || "G"}
                    {c.userState?.isMuted && <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border"><VolumeX className="h-2 w-2 text-muted-foreground" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                       <div className="flex items-center gap-1 min-w-0">
                          {c.userState?.isPinned && <Pin className="h-3 w-3 text-primary shrink-0 rotate-45" />}
                          <p className="text-[11px] font-bold truncate leading-tight">{c.title || "Support"}</p>
                       </div>
                       <span className="text-[8px] font-mono whitespace-nowrap">{formatDistanceToNow(new Date(c.updatedAt), { addSuffix: false })}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                       <p className="text-[10px] text-muted-foreground truncate flex-1 opacity-70">
                          {typingUsers[c.id]?.length > 0 ? (
                            <span className="text-primary animate-pulse italic font-bold">Sedang mengetik...</span>
                          ) : (
                            <>{c.userAlias ? `[${c.userAlias}] ` : ""}{c.Message?.[0]?.content || "..."}</>
                          )}
                       </p>
                       {unreadCounts[c.id] !== undefined && (
                         <span className={cn("flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-black h-3.5 min-w-[14px] px-0.5", unreadCounts[c.id] === -1 && "h-1.5 w-1.5 p-0")}>
                           {unreadCounts[c.id] !== -1 && unreadCounts[c.id]}
                         </span>
                       )}
                    </div>
                  </div>
                </button>
                <div className="absolute right-1 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl glassmorphism">
                      <DropdownMenuItem onClick={() => handleToggleArchive(c.id, !!c.userState?.isArchived)} className="gap-2 text-[10px]">
                        {c.userState?.isArchived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />} {c.userState?.isArchived ? "Buka Arsip" : "Arsipkan"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleTogglePin(c.id, !!c.userState?.isPinned)} className="gap-2 text-[10px]">
                        {c.userState?.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />} {c.userState?.isPinned ? "Lepas Sematan" : "Sematkan"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleRead(c.id, !!c.userState?.isRead)} className="gap-2 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> {c.userState?.isRead ? "Belum Dibaca" : "Sudah Dibaca"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleFavorite(c.id, !!c.userState?.isFavorite)} className="gap-2 text-[10px]">
                        <Star className={cn("h-3 w-3", c.userState?.isFavorite && "fill-primary")} /> Favorit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleMute(c.id, !!c.userState?.isMuted)} className="gap-2 text-[10px]">
                        {c.userState?.isMuted ? <Bell className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />} {c.userState?.isMuted ? "Bunyikan" : "Bisukan"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
             ))
           )}
        </div>
      </div>
    );
  }

  const activeConv = conversations.find((c: any) => c.id === activeConvId);

  return (
    <div className="flex flex-col h-full bg-background">
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

      {isEditingAlias && (
        <div className="p-4 bg-muted/30 border-b animate-in slide-in-from-top duration-300">
           <p className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-60">Nama Panggilan Obrolan</p>
           <div className="space-y-2">
             <div className="flex flex-col gap-1">
               <label className="text-[9px] font-medium ml-1">Alias Anda (User)</label>
               <Input 
                 placeholder="Set your nickname..." 
                 value={userNickname} 
                 onChange={(e) => setUserNickname(e.target.value)}
                 className="h-8 text-[11px] rounded-lg"
               />
             </div>
             <div className="flex flex-col gap-1">
               <label className="text-[9px] font-medium ml-1">Alias Admin</label>
               <Input 
                 placeholder="Set admin's nickname..." 
                 value={adminNickname} 
                 onChange={(e) => setAdminNickname(e.target.value)}
                 className="h-8 text-[11px] rounded-lg"
               />
             </div>
             <div className="flex gap-2 pt-1">
               <Button size="sm" className="h-7 text-[10px] flex-1 rounded-lg" onClick={handleUpdateAlias}>Simpan</Button>
               <Button size="sm" variant="ghost" className="h-7 text-[10px] rounded-lg" onClick={() => setIsEditingAlias(false)}>Batal</Button>
             </div>
           </div>
        </div>
      )}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-muted/[0.02]"
      >
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
             <Loader2 className="h-5 w-5 animate-spin" />
             <p className="text-[10px] font-mono tracking-tighter">Menghubungkan ke riwayat...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30 px-6">
            <div className="p-3 bg-muted rounded-full">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium">Obrolan baru dimulai.</p>
              <p className="text-[10px]">Ketik pesan di bawah untuk memulai!</p>
            </div>
          </div>
        ) : (
          messages.map((msg: any) => (
            <div 
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-sm transition-all animate-in fade-in duration-500",
                (msg.senderId === userId || msg.senderEmail === userEmail || (!userId && msg.senderEmail === `${guestSessionId}@guest.com`) || msg.isAdmin === false)
                  ? "self-end bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/10"
                  : "self-start bg-background text-foreground rounded-tl-none border shadow-sm"
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              <div className="flex items-center gap-1 self-end">
                <span className="mt-1.5 text-[9px] opacity-50 font-mono">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {!msg.isAdmin && (
                  <span className="flex items-center mt-1.5 opacity-50">
                    {msg.status === "READ" ? (
                      <CheckCheck className="h-3 w-3 text-blue-400" />
                    ) : msg.status === "DELIVERED" ? (
                      <CheckCheck className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {!isRegistered && (
        <div className="px-4 py-2 bg-primary/5 text-[10px] text-center text-primary/80 border-t border-t-primary/10">
          Chatting as Guest. <button onClick={() => setShowAuth(true)} className="underline font-bold text-primary">Login / Register</button> to save history.
        </div>
      )}

      <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
        <div className="relative flex items-center gap-2">
          <Input 
            value={content}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ketik pesan..."
            className="flex-1 pr-12 rounded-2xl bg-background border-primary/20 focus-visible:ring-primary/20 h-11 text-sm shadow-inner"
            disabled={sending || (!isRegistered && messageCount >= 3)}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleSendMessage}
            disabled={sending || !content.trim() || (!isRegistered && messageCount >= 3)}
            className="absolute right-1 h-9 w-9 rounded-xl text-primary hover:text-primary hover:bg-primary/10 active:scale-95 transition-all"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
