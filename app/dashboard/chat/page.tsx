"use client";

import { useState, useEffect, useRef } from "react";
import { getCurrentUser, getMessages, sendChatMessage } from "@/app/actions/messaging";
import { io, Socket } from "socket.io-client";
import { Send, Loader2, User, MessageCircle, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.io
  useEffect(() => {
    const initSocket = async () => {
      // First, ensure the server is initialized by hitting our API route
      await fetch("/api/socket");
      
      const newSocket = io({
        path: "/api/socket",
        addTrailingSlash: false,
      });

      newSocket.on("connect", () => {
        setConnected(true);
        console.log(">>> [Socket.io] Connected context:", newSocket.id);
      });

      newSocket.on("disconnect", () => {
        setConnected(false);
        console.log(">>> [Socket.io] Disconnected context");
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    };

    initSocket();
  }, []);

  // Sync Room & Receive Messages
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit("join-chat", user.id);

    socket.on("receive-message", (data: any) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === data.id);
        if (exists) return prev;
        return [...prev, data];
      });
    });

    return () => {
      socket.off("receive-message");
    };
  }, [socket, user]);

  // Load User & History
  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // FETCH BY BOTH EMAIL AND ID TO GET ALL HISTORY (AUTO-MERGE)
        const history = await getMessages(currentUser.email, currentUser.id);
        setMessages(history);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || sending || !user || !socket) return;

    setSending(true);
    try {
      // 1. Save to DB via Server Action
      // PASS CONTENT, EMAIL, AND ID FOR TRACKING
      const res = await sendChatMessage(content, user.email, user.id);
      if (res.success && res.message) {
        // 2. Add locally
        setMessages((prev) => [...prev, res.message]);
        
        // 3. Emit to others via Socket.io
        socket.emit("client-message", {
          ...res.message,
          room: `chat-${user.id}`
        });
        
        setContent("");
      } else {
        toast.error((res as any).error || "Failed to send");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium tracking-tight">Syncing conversation...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-160px)] bg-card border rounded-3xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-muted/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">WebSocket Chat</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {connected ? (
                <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold uppercase tracking-wider">
                  <Wifi className="h-3 w-3" /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase tracking-wider">
                  <WifiOff className="h-3 w-3" /> Reconnecting...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/5"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
            <div className="p-4 bg-muted rounded-full">
              <User className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">No messages yet</p>
              <p className="text-xs">Start chatting via WebSocket!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            return (
              <div 
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[80%] md:max-w-[70%] animate-in fade-in duration-300",
                  isMe ? "self-end ml-auto" : "self-start mr-auto"
                )}
              >
                <div 
                  className={cn(
                    "px-5 py-3 rounded-3xl text-sm shadow-sm",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-background border rounded-bl-none"
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                <span className={cn(
                  "mt-2 text-[10px] font-medium opacity-50",
                  isMe ? "self-end" : "self-start"
                )}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t bg-muted/20">
        <form onSubmit={handleSend} className="relative flex items-center gap-3">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-2xl h-14 pl-6 pr-14 bg-background border-muted shadow-sm focus:ring-primary/20"
            disabled={sending || !connected}
          />
          <Button 
            type="submit"
            size="icon"
            disabled={sending || !content.trim() || !connected}
            className="absolute right-2 h-10 w-10 rounded-xl transition-all active:scale-95 shadow-lg"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
