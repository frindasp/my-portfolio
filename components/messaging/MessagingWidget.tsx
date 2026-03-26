"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMessagingStore } from "@/store/use-messaging-store";
import ChatWindow from "./ChatWindow";
import { cn } from "@/lib/utils";

export default function MessagingWidget() {
  const { isOpen, toggleOpen } = useMessagingStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Messaging Window */}
      <div 
        className={cn(
          "mb-4 w-[350px] md:w-[400px] h-[500px] max-h-[70vh] rounded-2xl border bg-background shadow-2xl transition-all duration-300 origin-bottom-right overflow-hidden",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-75 opacity-0 translate-y-10 pointer-events-none"
        )}
      >
        <ChatWindow />
      </div>

      {/* Floating Button */}
      <Button
        size="icon"
        onClick={toggleOpen}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95",
          isOpen ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}
