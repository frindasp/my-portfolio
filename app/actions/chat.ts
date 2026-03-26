"use server";

import { PrismaClient } from "@prisma/client";
import { getCurrentUser } from "./auth";

const prisma = new PrismaClient();

/**
 * Get message history for a user
 */
export async function getChatMessages(userId: string) {
  if (!userId) return [];

  // Fetch all messages related to this user
  // (Either they sent it or they are the target - but in this simple personal portfolio,
  // usually it's User <-> Admin)
  try {
    return await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          // In a real multi-user chat, we'd need a receiverId,
          // but for portfolio contact, let's assume all messages with specific senderId
          // are the one chat thread.
        ],
      },
      orderBy: { createdAt: "asc" },
      include: { User: { select: { name: true, email: true } } },
    });
  } catch (error) {
    console.error("Fetch Messages Error:", error);
    return [];
  }
}

/**
 * Send a chat message
 */
export async function sendChatMessage(content: string) {
  if (!content.trim()) return { success: false, error: "Content is empty" };

  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const newMessage = await prisma.message.create({
      data: {
        content,
        senderId: user.id,
        isAdmin: false, // For users
      },
      include: { User: { select: { name: true, email: true } } },
    });

    return { success: true, message: newMessage };
  } catch (error) {
    console.error("Send Message Error:", error);
    return { success: false, error: "Failed to send message" };
  }
}
