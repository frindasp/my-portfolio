"use server";

import { pusherServer } from "@/lib/pusher";

/**
 * Test Pusher trigger as requested by the user
 */
export async function triggerPusherTest() {
  try {
    await pusherServer.trigger("my-channel", "my-event", {
      message: "hello world"
    });
    return { success: true };
  } catch (error) {
    console.error("Pusher Trigger Error:", error);
    return { success: false, error: "Failed to trigger Pusher" };
  }
}
