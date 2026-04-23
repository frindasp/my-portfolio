import PusherServer from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher (for sending events)
export const pusherServer = process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_CLUSTER 
  ? new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    })
  : ({} as any);

// Client-side Pusher (for receiving events)
export const pusherClient = process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ? new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      }
    )
  : ({} as any);
