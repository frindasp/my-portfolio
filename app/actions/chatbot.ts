"use server";

import { PrismaClient } from "@prisma/client";
import { getCurrentUser } from "./auth";
import { logActivity } from "@/lib/activity-log";

const prisma = new PrismaClient();

/**
 * Handle chatbot automated response or admin manual reply
 * @param contactId The ID of the contact to reply to
 * @param content The content of the response
 */
export async function sendChatbotReply(contactId: string, content: string) {
  if (!contactId || !content.trim()) {
    return { success: false, error: "Missing contactId or content" };
  }

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: "Unauthorized. Please login first." };
    }

    const newMessage = await prisma.message.create({
      data: {
        content,
        contactId,
        senderId: currentUser.id,
        isAdmin: true,
      },
      include: {
        Contact: true,
        User: {
          select: { name: true, email: true },
        },
      },
    });

    await logActivity({
      userId: currentUser.id,
      action: "CHAT_MESSAGE_SENT",
      description: content,
      route: "/dashboard/chat",
      method: "SERVER_ACTION",
      metadata: { messageId: newMessage.id, isAdmin: true },
    });

    return {
      success: true,
      message: newMessage,
      info: `Reply sent by ${currentUser.name || currentUser.email}`,
    };
  } catch (error) {
    console.error("Chatbot Action Error:", error);
    return { success: false, error: "Failed to send message" };
  }
}
