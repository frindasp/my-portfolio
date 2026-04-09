"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatWindow from "./ChatWindow";
import { useMessagingStore } from "@/store/use-messaging-store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export function FloatingLiveChat() {
  const { isOpen, toggleOpen, setGuestSessionId, guestSessionId, isRegistered, userEmail } = useMessagingStore();
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isRegistered && !guestSessionId) {
      const newGuestId = "guest-" + Date.now();
      setGuestSessionId(newGuestId);
      // We do NOT set email here automatically so it doesn't break other things, 
      // but if we want to use guest email for queries we can.
    }
  }, [isRegistered, guestSessionId, setGuestSessionId]);

  const handleOpenClick = () => {
    if (isRegistered) {
      router.push("/dashboard/chat");
    } else {
      setShowDialog(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-20 z-[70]">
         <Button onClick={handleOpenClick} className="h-12 w-12 rounded-full shadow-lg p-0 bg-primary hover:bg-primary/90">
             <MessageCircle className="h-6 w-6 text-primary-foreground" />
         </Button>
      </div>

      {isRegistered && isOpen && (
         <div className="fixed bottom-20 right-5 z-[80] w-[380px] h-[600px] max-h-[80vh] flex flex-col bg-background border shadow-2xl rounded-2xl overflow-hidden glassmorphism animate-in slide-in-from-bottom-5">
           <div className="flex bg-primary/10 items-center justify-between p-3 border-b">
              <h3 className="font-bold shrink-0 text-sm">Live Chat</h3>
              <Button variant="ghost" size="icon" onClick={toggleOpen} className="h-6 w-6 rounded-full"><X className="h-4 w-4" /></Button>
           </div>
           <div className="flex-1 relative overflow-hidden">
             <ChatWindow />
           </div>
         </div>
      )}

      {/* For Unregistered / Guest Users */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden h-[80vh] sm:h-[600px] flex flex-col rounded-3xl">
           <DialogTitle className="sr-only">Live Chat</DialogTitle>
           <div className="flex-1 relative overflow-hidden">
              <ChatWindow />
           </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
