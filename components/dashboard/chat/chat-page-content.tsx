"use client";

import {
  Send,
  Loader2,
  User,
  MessageCircle,
  Plus,
  Hash,
  RefreshCw,
  MoreVertical,
  Pin,
  Archive,
  VolumeX,
  CheckCircle2,
  Trash2,
  Eraser,
  PinOff,
  Bell,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useTranslation } from "@/hooks/use-translation";
import { useChatLogicHooks } from "@/hooks/chat/use-chat-logic-hooks";

export function ChatPageContent() {
  const { lang, t_chat } = useTranslation();
  const {
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
  } = useChatLogicHooks();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">{t_chat.status.initializing}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-700 relative overflow-hidden">
      <div
        className={cn(
          "w-full md:w-96 flex flex-col bg-card border rounded-3xl shadow-xl overflow-hidden glassmorphism border-primary/10 transition-all duration-300",
          activeConvId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="p-4 border-b bg-muted/20 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />{" "}
              {t_chat.sidebar.title}
            </h2>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={() => {}}
              disabled={true}
            >
              <RefreshCw className="h-3 w-3 opacity-20" />
            </Button>
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl overflow-x-auto no-scrollbar">
            {Object.keys(t_chat.sidebar.tabs).map((t) => (
              <button
                key={t}
                onClick={() => setFilterTab(t)}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all",
                  filterTab === t
                    ? "bg-background shadow-sm text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t_chat.sidebar.tabs[t as keyof typeof t_chat.sidebar.tabs]}
                {t === "unread" &&
                  Object.keys(unreadCounts).length > 0 &&
                  ` ${Object.keys(unreadCounts).length}`}
              </button>
            ))}
          </div>
          <form onSubmit={handleCreateConv} className="relative group">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t_chat.sidebar.newTitle}
              className="rounded-xl pl-9 pr-9 h-10 bg-background/50 text-xs"
            />
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <button
              type="submit"
              disabled={!newTitle.trim() || isCreating}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-30 italic text-xs">
              {t_chat.sidebar.noThreads}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className="relative group border-b border-primary/5"
              >
                <button
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    "w-full text-left p-4 transition-all flex gap-3 relative",
                    activeConvId === conv.id
                      ? "bg-primary/5"
                      : "hover:bg-muted/30",
                  )}
                >
                  {activeConvId === conv.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 relative",
                      activeConvId === conv.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {conv.title?.charAt(0) || "G"}
                    {conv.userState?.isMuted && (
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border">
                        <VolumeX className="h-2 w-2 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        {conv.userState?.isPinned && (
                          <Pin className="h-3 w-3 text-primary shrink-0 rotate-45" />
                        )}
                        <p className="text-xs font-bold truncate">
                          {conv.title || "Chat"}
                        </p>
                      </div>
                      <span className="text-[9px] opacity-40 font-medium whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.updatedAt), {
                          addSuffix: false,
                          locale: lang === "id" ? idLocale : undefined,
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-muted-foreground truncate flex-1 opacity-70">
                        {conv.userAlias ? `[${conv.userAlias}] ` : ""}
                        {conv.Message?.[0]?.content || "..."}
                      </p>
                      {unreadCounts[conv.id] !== undefined && (
                        <span
                          className={cn(
                            "flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[8px] font-black h-4 min-w-4 px-1",
                            unreadCounts[conv.id] === -1 && "h-2 w-2 p-0",
                          )}
                        >
                          {unreadCounts[conv.id] !== -1 &&
                            unreadCounts[conv.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-lg"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-48 rounded-xl shadow-xl glassmorphism"
                    >
                      <DropdownMenuItem
                        onClick={() =>
                          handleToggleArchive(
                            conv.id,
                            !!conv.userState?.isArchived,
                          )
                        }
                        className="gap-2 text-xs"
                      >
                        {conv.userState?.isArchived ? (
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}{" "}
                        {conv.userState?.isArchived
                          ? t_chat.actions.unarchive
                          : t_chat.actions.archive}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleTogglePin(conv.id, !!conv.userState?.isPinned)
                        }
                        className="gap-2 text-xs"
                      >
                        {conv.userState?.isPinned ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}{" "}
                        {conv.userState?.isPinned
                          ? t_chat.actions.unpin
                          : t_chat.actions.pin}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleToggleRead(conv.id, !!conv.userState?.isRead)
                        }
                        className="gap-2 text-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                        {conv.userState?.isRead
                          ? t_chat.actions.unread
                          : t_chat.actions.read}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleToggleFavorite(
                            conv.id,
                            !!conv.userState?.isFavorite,
                          )
                        }
                        className="gap-2 text-xs"
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            conv.userState?.isFavorite && "fill-primary",
                          )}
                        />{" "}
                        {conv.userState?.isFavorite
                          ? t_chat.actions.unfavorite
                          : t_chat.actions.favorite}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleToggleMute(conv.id, !!conv.userState?.isMuted)
                        }
                        className="gap-2 text-xs"
                      >
                        {conv.userState?.isMuted ? (
                          <Bell className="h-3.5 w-3.5" />
                        ) : (
                          <VolumeX className="h-3.5 w-3.5" />
                        )}{" "}
                        {conv.userState?.isMuted
                          ? t_chat.actions.unmute
                          : t_chat.actions.mute}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleClear(conv.id)}
                        className="gap-2 text-xs text-warning"
                      >
                        <Eraser className="h-3.5 w-3.5" />{" "}
                        {t_chat.actions.clear}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(conv.id)}
                        className="gap-2 text-xs text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />{" "}
                        {t_chat.actions.delete}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col bg-card border rounded-3xl shadow-xl overflow-hidden glassmorphism border-primary/10 transition-all",
          !activeConvId ? "hidden md:flex" : "flex",
        )}
      >
        {activeConvId ? (
          <>
            <div className="flex items-center justify-between p-4 border-b bg-muted/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setActiveConvId(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Hash className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold">
                      {activeConv?.title || "Chat"}
                    </h2>
                    <button
                      onClick={() => {
                        setUserNickname(activeConv?.userAlias || "");
                        setAdminNickname(activeConv?.adminAlias || "");
                        setIsEditingAlias(!isEditingAlias);
                      }}
                      className="opacity-30 hover:opacity-100"
                    >
                      <User className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[9px] text-green-500 font-bold uppercase tracking-widest mt-0.5">
                    {t_chat.status.active}
                  </p>
                </div>
              </div>
              {isEditingAlias && (
                <div className="absolute right-4 top-16 z-50 bg-background border rounded-xl shadow-2xl p-4 w-56 animate-in slide-in-from-top-2">
                  <p className="text-[9px] font-bold uppercase opacity-50 mb-3">
                    {t_chat.dialogs.nicknames}
                  </p>
                  <div className="space-y-3">
                    <Input
                      value={userNickname}
                      onChange={(e) => setUserNickname(e.target.value)}
                      placeholder={t_chat.dialogs.userAlias}
                      className="h-8 text-xs"
                    />
                    <Input
                      value={adminNickname}
                      onChange={(e) => setAdminNickname(e.target.value)}
                      placeholder={t_chat.dialogs.adminAlias}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-[10px] flex-1"
                        onClick={handleUpdateAlias}
                      >
                        {t_chat.actions.save}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px]"
                        onClick={() => setIsEditingAlias(false)}
                      >
                        {t_chat.actions.cancel}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-muted/5 custom-scrollbar"
            >
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <p className="text-[10px]">{t_chat.status.loading}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-10">
                  <MessageCircle className="h-12 w-12 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    {t_chat.status.starting}
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe =
                    msg.senderId === user.id ||
                    (msg.isAdmin && user.Role?.name === "Admin");
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3 animate-in fade-in duration-300",
                        isMe ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold transition-all",
                          isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted shadow-sm",
                        )}
                      >
                        {isMe
                          ? "ME"
                          : activeConv?.adminAlias?.charAt(0) ||
                            msg.User?.name?.charAt(0) ||
                            "?"}
                      </div>
                      <div
                        className={cn(
                          "flex flex-col max-w-[80%]",
                          isMe ? "items-end" : "items-start",
                        )}
                      >
                        <div
                          className={cn(
                            "px-4 py-3 rounded-2xl text-[13px] leading-snug shadow-sm",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-background border rounded-tl-none",
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="mt-1 text-[9px] font-bold opacity-30">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 md:p-6 border-t bg-muted/10">
              <form
                onSubmit={handleSend}
                className="relative flex items-center gap-3"
              >
                <Input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t_chat.placeholders.typeMessage}
                  className="flex-1 rounded-xl h-12 pr-12 bg-background/50 border-primary/20 text-sm"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="absolute right-2 h-9 w-9 rounded-lg"
                  size="icon"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center opacity-30">
            <MessageCircle className="h-12 w-12 animate-pulse" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold">
                {t_chat.placeholders.selectThread}
              </h3>
              <p className="text-xs">{t_chat.placeholders.sidebarPrompt}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
