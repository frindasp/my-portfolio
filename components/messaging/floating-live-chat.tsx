"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatWindow from "./ChatWindow";
import { useMessagingStore } from "@/store/use-messaging-store";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/app/actions/messaging";

export function FloatingLiveChat() {
  const { 
    isOpen, 
    toggleOpen, 
    setGuestSessionId, 
    guestSessionId, 
    isRegistered, 
    setUser
  } = useMessagingStore();
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Sync actual auth state if not already marked as registered
    if (!isRegistered) {
      getCurrentUser().then(user => {
        if (user) {
          setUser({ id: user.id, name: user.name, email: user.email });
        }
      });
    }

    if (!isRegistered && !guestSessionId) {
      const newGuestId = "guest-" + Date.now();
      setGuestSessionId(newGuestId);
    }
  }, [isRegistered, guestSessionId, setGuestSessionId, setUser]);

  const handleOpenClick = async () => {
    // Double check auth state just in case
    const user = await getCurrentUser();
    if (user || isRegistered) {
      if (user && !isRegistered) {
        setUser({ id: user.id, name: user.name, email: user.email });
      }
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
