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
import { toast } from "sonner";
import { useMessagingStore } from "@/store/use-messaging-store";
import { useTranslation } from "@/hooks/use-translation";

export function useChatLogicHooks() {
  const { t_chat } = useTranslation();
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
  }, [setGlobalUnreadCount]);

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
        toast.info(t_chat.toasts.newMessage);
      }
    });
    return () => { pusherClient.unsubscribe("admin-notifications"); };
  }, [user, activeConvId, t_chat, setGlobalUnreadCount]);

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
  }, [activeConvId, setGlobalUnreadCount]);

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
    } catch (err) { toast.error(t_chat.toasts.error); }
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
        toast.success(t_chat.toasts.newConv);
      }
    } catch (err) { toast.error(t_chat.toasts.error); }
    finally { setIsCreating(false); }
  };

  const handleUpdateAlias = async () => {
    if (!activeConvId) return;
    const res = await updateConversationAlias(activeConvId, userNickname, adminNickname);
    if (res.success) {
      toast.success(t_chat.toasts.nicknamesUpdated);
      setIsEditingAlias(false);
      setConversations(conversations.map(c => c.id === activeConvId ? { ...c, userAlias: userNickname, adminAlias: adminNickname } : c));
    }
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    const res = await toggleConversationPinnedStatus(id, !isPinned);
    if (res.success) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isPinned: !isPinned } } : c));
      toast.success(!isPinned ? t_chat.toasts.pinned : t_chat.toasts.unpinned);
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    const res = await toggleConversationFavoriteStatus(id, !isFavorite);
    if (res.success) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isFavorite: !isFavorite } } : c));
      toast.success(!isFavorite ? t_chat.toasts.favorited : t_chat.toasts.unfavorited);
    }
  };

  const handleToggleArchive = async (id: string, isArchived: boolean) => {
    const res = await toggleConversationArchivedStatus(id, !isArchived);
    if (res.success) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isArchived: !isArchived } } : c));
      toast.success(!isArchived ? t_chat.toasts.archived : t_chat.toasts.restored);
    }
  };

  const handleToggleMute = async (id: string, isMuted: boolean) => {
    const res = await toggleConversationMutedStatus(id, !isMuted);
    if (res.success) {
      setConversations(prev => prev.map(c => c.id === id ? { ...c, userState: { ...c.userState, isMuted: !isMuted } } : c));
      toast.success(!isMuted ? t_chat.toasts.muted : t_chat.toasts.unmuted);
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
      toast.success(!isRead ? t_chat.toasts.markedUnread : t_chat.toasts.markedRead);
    }
  };

  const handleClear = async (id: string) => {
    if (!confirm(t_chat.dialogs.clearConfirm)) return;
    const res = await clearConversationMessages(id);
    if (res.success) {
      if (activeConvId === id) setMessages([]);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, Message: [] } : c));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t_chat.dialogs.deleteConfirm)) return;
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

  const activeConv = conversations.find(c => c.id === activeConvId);

  return {
    conversations,
    activeConvId,
    setActiveConvId,
    messages,
    content,
    setContent,
    newTitle,
    setNewTitle,
    loading,
    loadingMessages,
    sending,
    user,
    isCreating,
    unreadCounts,
    isEditingAlias,
    setIsEditingAlias,
    userNickname,
    setUserNickname,
    adminNickname,
    setAdminNickname,
    filterTab,
    setFilterTab,
    scrollRef,
    handleSend,
    handleCreateConv,
    handleUpdateAlias,
    handleTogglePin,
    handleToggleFavorite,
    handleToggleArchive,
    handleToggleMute,
    handleToggleRead,
    handleClear,
    handleDelete,
    filteredConversations,
    activeConv,
  };
}
