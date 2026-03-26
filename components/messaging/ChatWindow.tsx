"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Loader2, User, LogIn, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessagingStore } from "@/store/use-messaging-store";
import {
  getMessageOwnershipDiff,
  getMessages,
  sendChatMessage,
  syncMessageOwnership,
} from "@/app/actions/messaging";
import AuthOverlay from "./AuthOverlay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatWindow() {
  const { messages, setMessages, addMessage, userId, userEmail, isRegistered, userName } = useMessagingStore();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [syncingOwnership, setSyncingOwnership] = useState(false);
  const [ownershipDiffCount, setOwnershipDiffCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userEmail) {
      getMessages(userEmail, userId || undefined).then(setMessages);
    }
  }, [userEmail, userId, setMessages]);

  useEffect(() => {
    if (!userEmail || !userId) {
      setOwnershipDiffCount(0);
      return;
    }

    getMessageOwnershipDiff(userEmail, userId).then((result) => {
      setOwnershipDiffCount(result.pendingCount);
    });
  }, [userEmail, userId, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!content.trim() || sending) return;

    // Even if not registered, we can send anonymously if we have an email
    // Or we show the auth screen if they haven't identified yet
    if (!userEmail && !isRegistered) {
      setShowAuth(true);
      return;
    }

    setSending(true);
    try {
      const result = await sendChatMessage(content, userEmail || undefined, userId || undefined);
      if (result.success && result.message) {
        addMessage(result.message);
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

  const handleSyncOwnership = async () => {
    if (!userEmail || !userId || syncingOwnership || ownershipDiffCount === 0) return;

    setSyncingOwnership(true);
    try {
      const result = await syncMessageOwnership(userEmail, userId);
      if (result.success) {
        setOwnershipDiffCount(0);
        const refreshed = await getMessages(userEmail, userId);
        setMessages(refreshed);
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

  if (showAuth && !isRegistered) {
    return (
      <div className="relative h-full">
        <AuthOverlay onCancel={() => setShowAuth(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{userName || (userEmail ? userEmail.split('@')[0] : "Guest")}</h3>
            <p className="text-[10px] text-muted-foreground">{userEmail || "Anonymous Chat"}</p>
          </div>
        </div>
        {!isRegistered && (
          <Button variant="ghost" size="sm" onClick={() => setShowAuth(true)} className="text-xs gap-1">
            <LogIn className="h-3 w-3" /> Login
          </Button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50 px-6">
            <div className="p-3 bg-muted rounded-full">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No messages yet.</p>
              <p className="text-xs text-muted-foreground">Type a message below to start chatting with me!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={cn(
                "flex flex-col max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                msg.senderId === userId || msg.senderEmail === userEmail
                  ? "self-end bg-primary text-primary-foreground rounded-tr-none"
                  : "self-start bg-muted text-foreground rounded-tl-none border shadow-sm"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span className="mt-1 text-[10px] opacity-70 self-end">
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

      {isRegistered && userEmail && userId && (
        <div className="px-4 py-2 bg-amber-500/10 text-[10px] text-amber-700 border-t border-t-amber-500/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center sm:text-left leading-relaxed">
              {ownershipDiffCount > 0 ? (
                <>
                  Ditemukan <strong>{ownershipDiffCount}</strong> chat dengan email yang sama tetapi belum ditandai sebagai milik akun ini.
                </>
              ) : (
                <>Semua chat dengan email ini sudah sinkron ke akun kamu.</>
              )}
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSyncOwnership}
              disabled={syncingOwnership || ownershipDiffCount === 0}
              className="h-7 px-2 text-[10px] self-center sm:self-auto"
            >
              {syncingOwnership ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />} Padankan
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-card/50">
        <div className="relative flex items-center gap-2">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={isRegistered || userEmail ? "Type your message..." : "Enter your email to start..."}
            className="flex-1 pr-10 rounded-full bg-background border-primary/20 focus-visible:ring-primary/30 h-11"
          />
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleSendMessage}
            disabled={sending || !content.trim()}
            className="absolute right-1 h-9 w-9 rounded-full text-primary hover:text-primary hover:bg-primary/10"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
