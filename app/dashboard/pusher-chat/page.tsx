"use client";

import { useState, useEffect } from "react";
import { pusherClient } from "@/lib/pusher";
import { triggerPusherTest } from "@/app/actions/pusher-test";
import { Button } from "@/components/ui/button";
import { Zap, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PusherChatPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    // 1. Subscribe to channel
    const channel = pusherClient.subscribe("my-channel");

    // 2. Bind event
    channel.bind("my-event", (data: any) => {
      console.log(">>> [Pusher] Event received:", data);
      setEvents((prev) => [...prev, { ...data, timestamp: new Date() }]);
      toast.info("New Pusher event received!");
    });

    return () => {
      pusherClient.unsubscribe("my-channel");
    };
  }, []);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await triggerPusherTest();
      if (res.success) {
        toast.success("Triggered 'hello world' from server!");
      } else {
        toast.error(res.error || "Failed to trigger");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Pusher Real-time</h1>
        <p className="text-muted-foreground">Monitoring 'my-channel' for live 'my-event' updates.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Control Card */}
        <div className="bg-card border rounded-3xl p-8 shadow-sm flex flex-col justify-between h-[300px]">
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
               <Zap className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold">Event Trigger</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
               Click the button to fire a server-side Pusher event. All connected clients will see the "hello world" message instantly.
            </p>
          </div>
          <Button 
            onClick={handleTrigger} 
            disabled={triggering}
            className="w-full h-14 rounded-2xl text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
          >
            {triggering ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            Trigger "hello world"
          </Button>
        </div>

        {/* Console / Event List */}
        <div className="bg-card border rounded-3xl p-8 shadow-sm flex flex-col h-[500px]">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
            Live Logs
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 font-mono text-sm">
            {events.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40">
                  <p>Waiting for events...</p>
               </div>
            ) : (
              events.map((ev, idx) => (
                <div 
                   key={idx} 
                   className="p-4 rounded-2xl bg-muted/50 border-l-4 border-indigo-500 animate-in slide-in-from-left-4 duration-300"
                >
                  <p className="text-xs opacity-50 mb-1">{ev.timestamp.toLocaleTimeString()}</p>
                  <p className="font-bold text-indigo-500">Event: "my-event"</p>
                  <code className="block mt-2 text-xs bg-background/50 p-2 rounded-lg">
                    {JSON.stringify(ev, null, 2)}
                  </code>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
