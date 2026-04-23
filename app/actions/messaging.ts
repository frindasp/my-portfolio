"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { getOrCreateRole } from "@/lib/roles";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity-log";
import { pusherServer } from "@/lib/pusher";

const prisma = new PrismaClient();

/**
 * Logout user
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("portfolio_session");
  return { success: true };
}

/**
 * Check if the email is registered
 */
export async function checkEmailStatus(email: string) {
  const userRole = await getOrCreateRole("User");

  // Use email_roleId compound unique as defined in schema
  const registeredUser = await prisma.user.findUnique({
    where: {
      email_roleId: {
        email,
        roleId: userRole.id,
      },
    },
  });

  return {
    hasContacted: false,
    lastContactName: null,
    isRegistered: !!registeredUser && !registeredUser.name?.startsWith("anonymous-"),
  };
}

/**
 * Create an anonymous user
 */
export async function createAnonymousUser() {
  try {
    const userRole = await getOrCreateRole("User");
    const anonymousId = Math.random().toString(36).substring(2, 8);
    const user = await prisma.user.create({
      data: {
        name: `anonymous-${anonymousId}`,
        email: `anonymous-${anonymousId}@guest.com`,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        roleId: userRole.id,
      },
    });
    return { success: true, userId: user.id };
  } catch (error) {
    console.error("createAnonymousUser error:", error);
    return { success: false, error: "Failed to create anonymous user" };
  }
}

/**
 * Send OTP for email verification / Login
 */
export async function sendVerificationOTP(
  email: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    const userRole = await getOrCreateRole("User");
    const user = await prisma.user.findUnique({
      where: { email_roleId: { email, roleId: userRole.id } },
    });

    // Upsert token in VerificationToken model
    await prisma.verificationToken.upsert({
      where: { email_token: { email, token: otp } },
      update: {
        expires,
      },
      create: {
        email,
        token: otp,
        expires,
      },
    });

    return {
      success: true,
      message:
        "Verification code generated. Please contact admin for your code.",
      isRegistered: !!user,
      isContact: false,
    } as any;
  } catch (err) {
    console.error("sendVerificationOTP error:", err);
    return { success: false, error: "Failed to generate verification code" };
  }
}

/**
 * Login with Password
 */
export async function loginWithPassword(email: string, password: string) {
  if (!email || !password)
    return { success: false, error: "Email and password are required" };

  try {
    const userRole = await getOrCreateRole("User");
    const user = await prisma.user.findUnique({
      where: {
        email_roleId: { email, roleId: userRole.id },
      },
      include: { role: true },
    });

    if (!user)
      return { success: false, error: "Account not found or invalid password" };

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return { success: false, error: "Invalid password" };

    // Check for 2FA
    if (user.twoFactorEnabled) {
      return {
        success: true,
        requires2FA: true,
        email: user.email,
        userId: user.id,
      };
    }

    // Set session
    const cookieStore = await cookies();
    cookieStore.set("portfolio_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    // Determine if we should show the MFA Enrollment popup
    let showMfaEnrollment = false;
    const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
    if (!user.twoFactorEnabled) {
      if (!user.mfaDismissedAt) {
        showMfaEnrollment = true;
      } else {
        const lastDismissedTime = new Date(user.mfaDismissedAt).getTime();
        const elapsed = Date.now() - lastDismissedTime;
        // Show again after 24 hours if 2FA is still inactive
        if (elapsed >= ONE_DAY_IN_MS) {
          showMfaEnrollment = true;
        }
      }
    }

    await logActivity({
      userId: user.id,
      action: "LOGIN",
      description: "Login dari modul messaging berhasil.",
      route: "/login",
      method: "SERVER_ACTION",
    });

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        showMfaEnrollment,
      },
    };
  } catch (error) {
    console.error("Login Password error:", error);
    return { success: false, error: "Something went wrong" };
  }
}

/**
 * Verify OTP and Register/Login
 */
export async function verifyOTPAndLogin(
  email: string,
  token: string,
  password?: string,
  name?: string,
  anonymousUserId?: string,
) {
  const verification = await prisma.verificationToken.findUnique({
    where: { email_token: { email, token } },
  });

  if (!verification || verification.expires < new Date()) {
    return { success: false, error: "Invalid or expired OTP" };
  }

  // Delete token after successful use
  await prisma.verificationToken.delete({
    where: { id: verification.id },
  });

  const userRole = await getOrCreateRole("User");

  // If password provided, it's a registration or update
  let user;
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // If we have an anonymous user, update them
    if (anonymousUserId) {
      user = await prisma.user.update({
        where: { id: anonymousUserId },
        data: {
          email,
          password: hashedPassword,
          name: name || undefined,
          updatedAt: new Date(),
        },
        include: { role: true },
      });
    } else {
      user = await prisma.user.upsert({
        where: {
          email_roleId: { email, roleId: userRole.id },
        },
        update: {
          password: hashedPassword,
          name: name || undefined,
        },
        create: {
          email,
          password: hashedPassword,
          roleId: userRole.id,
          name: name || null,
          updatedAt: new Date(),
        },
        include: { role: true },
      });
    }
  } else {
    // Just find existing user
    user = await prisma.user.findUnique({
      where: {
        email_roleId: { email, roleId: userRole.id },
      },
      include: { role: true },
    });
  }

  if (!user) {
    return {
      success: false,
      error: "User not found. Please register first.",
    };
  }

  // --- AUTO MERGING LOGIC ---
  // Claim any guest messages sent with this email previously
  try {
    await (prisma.message.updateMany as any)({
      where: {
        senderEmail: email,
        senderId: null, // Only claim unclaimed ones
      },
      data: {
        senderId: user.id,
      },
    });

    console.log(`Auto-merged messages for ${email}`);
  } catch (mergeError) {
    console.error("Auto-merge failed:", mergeError);
  }
  // --------------------------

  // Set session
  const cookieStore = await cookies();
  cookieStore.set("portfolio_session", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  await logActivity({
    userId: user.id,
    action: "LOGIN_OTP",
    description: "Login/registrasi OTP dari messaging berhasil.",
    route: "/login",
    method: "SERVER_ACTION",
  });

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
    },
  };
}

/**
 * Forgot Password (Sends OTP for reset)
 */
export async function forgotPassword(email: string) {
  const userRole = await getOrCreateRole("User");
  const user = await prisma.user.findFirst({
    where: { email, roleId: userRole.id },
  });
  if (!user) return { success: false, error: "User not found" };

  const res = await sendVerificationOTP(email);
  return res;
}

/**
 * Reset Password using OTP
 */
export async function resetPassword(
  email: string,
  token: string,
  newPw: string,
) {
  const verification = await prisma.verificationToken.findUnique({
    where: { email_token: { email, token } },
  });

  if (!verification || verification.expires < new Date()) {
    return { success: false, error: "Invalid or expired OTP" };
  }

  const userRole = await getOrCreateRole("User");
  const hashedPassword = await bcrypt.hash(newPw, 10);
  await prisma.user.updateMany({
    where: { email, roleId: userRole.id },
    data: { password: hashedPassword },
  });

  await prisma.verificationToken.delete({ where: { id: verification.id } });

  const updatedUsers = await prisma.user.findMany({
    where: { email, roleId: userRole.id },
    select: { id: true },
  });

  for (const updatedUser of updatedUsers) {
    await logActivity({
      userId: updatedUser.id,
      action: "PASSWORD_CHANGED",
      description: "Password diubah dari modul messaging.",
      route: "/login",
      method: "SERVER_ACTION",
    });
  }

  return { success: true };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;
  if (!userId) return null;

  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
  } catch (error) {
    return null;
  }
}

/**
 * Fetch messages for the user or a specific conversation.
 */
export async function getMessages(email?: string, userId?: string, conversationId?: string) {
  if (conversationId) {
    return await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    });
  }

  if (!email && !userId) return [];

  const normalizedEmail = email?.trim().toLowerCase();

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        ...(normalizedEmail ? [{ senderEmail: normalizedEmail }] : []),
        ...(userId ? [{ senderId: userId }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return messages;
}

/**
 * Create a new conversation
 */
export async function createConversation(title: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const conversation = await prisma.conversation.create({
      data: {
        email: user.email,
        name: user.name || user.email.split("@")[0],
        title,
      }
    });
    return { success: true, conversation };
  } catch (error) {
    return { success: false, error: "Failed to create conversation" };
  }
}

/**
 * Send a chat message
 */
export async function sendChatMessage(
  content: string,
  email?: string,
  userId?: string,
  conversationId?: string,
) {
  if (!content.trim()) return { success: false, error: "Content is required" };

  try {
    let finalConvId = conversationId;

    // If no conversationId, try to find or create one for this user/email
    if (!finalConvId && (email || userId)) {
      const emailToUse = email?.trim().toLowerCase();
      
      let existingConv = await prisma.conversation.findFirst({
        where: {
          OR: [
            ...(emailToUse ? [{ email: emailToUse }] : []),
            ...(userId ? [{ messages: { some: { senderId: userId } } }] : [])
          ]
        },
        orderBy: { updatedAt: "desc" }
      });

      if (!existingConv) {
        existingConv = await prisma.conversation.create({
          data: {
            email: emailToUse || "guest@anonymous.com",
            name: emailToUse ? emailToUse.split("@")[0] : "Guest",
            title: "Live Chat Session",
          }
        });
      }
      finalConvId = existingConv.id;
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderEmail: email || null,
        senderId: userId || null,
        conversationId: finalConvId || null,
        isAdmin: false,
        status: 'SENT',
      },
      include: {
        user: { select: { name: true, email: true } },
      }
    });

    if (finalConvId) {
      await prisma.conversation.update({
        where: { id: finalConvId },
        data: { updatedAt: new Date() }
      });

      // Trigger Pusher
      const pusherMessage = {
        ...message,
        senderRole: "user",
        sender: { name: message.user?.name || message.senderEmail || "Guest" }
      };

      await pusherServer.trigger(`conversation-${finalConvId}`, "new-message", pusherMessage);
      
      // Notify admin
      await pusherServer.trigger("admin-notifications", "conversation-updated", {
        conversationId: finalConvId,
        lastMessage: pusherMessage
      });
    }

    return { success: true, message };
  } catch (error) {
    console.error("sendChatMessage error:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Get all conversations for a user
 */
export async function getConversations(email?: string, userId?: string) {
  const currentUser = await getCurrentUser();
  const resolvedEmail = (currentUser?.email || email)?.trim().toLowerCase();
  const resolvedUserId = currentUser?.id || userId || "GUEST";

  if (!resolvedEmail && !resolvedUserId && !currentUser) return [];

  const isAdmin = currentUser?.role?.name === "Admin";

  const findWhere = isAdmin 
    ? {} 
    : { 
        OR: [
          { email: resolvedEmail || undefined },
          { messages: { some: { senderId: resolvedUserId || undefined } } }
        ]
      };

  const conversations = await prisma.conversation.findMany({
    where: findWhere,
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Fetch states for this user
  const states = await prisma.conversationReadState.findMany({
    where: {
      conversationId: { in: conversations.map(c => c.id) },
      userId: resolvedUserId,
    },
  });

  const stateMap = states.reduce((acc: any, s: any) => {
    acc[s.conversationId] = s;
    return acc;
  }, {});

  return conversations.map(conv => ({
    ...conv,
    lastMessage: conv.messages?.[0],
    userState: stateMap[conv.id] || {
      isRead: true,
      isPinned: false,
      isArchived: false,
      isFavorite: false,
      isMuted: false,
    },
  }));
}

export async function updateConversationAlias(conversationId: string, userAlias: string, adminAlias: string) {
  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { userAlias, adminAlias }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function getUnreadConversationCounts(email?: string, userId?: string) {
  const currentUser = await getCurrentUser();
  const resolvedEmail = (currentUser?.email || email)?.trim().toLowerCase();
  const resolvedUserId = currentUser?.id || userId || null;

  if (!resolvedEmail && !resolvedUserId) return {};

  const allConversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { email: resolvedEmail || undefined },
        { messages: { some: { senderEmail: resolvedEmail || undefined } } }
      ]
    },
    select: {
      id: true,
    }
  });

  const convIds = allConversations.map(c => c.id);
  
  const readStates = await prisma.conversationReadState.findMany({
    where: {
      conversationId: { in: convIds },
      userId: resolvedUserId || "GUEST",
    }
  });

  const readStateMap = readStates.reduce<Record<string, { lastReadAt: Date, isRead: boolean }>>((acc, s) => {
    acc[s.conversationId] = { lastReadAt: s.lastReadAt, isRead: s.isRead };
    return acc;
  }, {});

  const unreadMap: Record<string, number> = {};

  for (const convId of convIds) {
    const state = readStateMap[convId] || { lastReadAt: new Date(0), isRead: true };
    const count = await prisma.message.count({
      where: {
        conversationId: convId,
        isAdmin: true,
        createdAt: { gt: state.lastReadAt }
      }
    });

    if (count > 0) {
      unreadMap[convId] = count;
    } else if (!state.isRead) {
      unreadMap[convId] = -1;
    }
  }

  return unreadMap;
}

export async function markConversationAsRead(conversationId: string, userId?: string) {
  if (!conversationId) return { success: false, error: "Conversation ID is required" };
  
  const currentUser = await getCurrentUser();
  const resolvedUserId = currentUser?.id || userId || "GUEST";

  await prisma.conversationReadState.upsert({
    where: {
      conversationId_userId: {
        conversationId,
        userId: resolvedUserId,
      }
    },
    update: { 
      lastReadAt: new Date(),
      isRead: true,
    },
    create: {
      conversationId,
      userId: resolvedUserId,
      lastReadAt: new Date(),
      isRead: true,
    }
  });

  // Also update all admin messages in this conversation to READ
  await prisma.message.updateMany({
    where: { 
      conversationId, 
      isAdmin: true, // User marks Admin messages as read
      status: { not: 'READ' } 
    },
    data: { status: 'READ', isRead: true }
  });

  // Trigger Pusher notification for the admin
  await pusherServer.trigger(`conversation-${conversationId}`, "conversation-status-updated", {
    conversationId,
    status: "READ",
  });

  return { success: true };
}

export async function toggleConversationReadStatus(conversationId: string, isRead: boolean, userId?: string) {
  if (!conversationId) return { success: false };
  const currentUser = await getCurrentUser();
  const resolvedUserId = currentUser?.id || userId || "GUEST";

  await prisma.conversationReadState.upsert({
    where: { conversationId_userId: { conversationId, userId: resolvedUserId } },
    update: { isRead },
    create: { conversationId, userId: resolvedUserId, isRead },
  });
  return { success: true };
}

export async function toggleConversationPinnedStatus(conversationId: string, isPinned: boolean, userId?: string) {
  if (!conversationId) return { success: false };
  const currentUser = await getCurrentUser();
  const resolvedUserId = currentUser?.id || userId || "GUEST";

  await prisma.conversationReadState.upsert({
    where: { conversationId_userId: { conversationId, userId: resolvedUserId } },
    update: { isPinned },
    create: { conversationId, userId: resolvedUserId, isPinned },
  });
  return { success: true };
}

export async function toggleConversationFavoriteStatus(conversationId: string, isFavorite: boolean, userId?: string) {
  if (!conversationId) return { success: false };
  const currentUser = await getCurrentUser();
  const resolvedUserId = currentUser?.id || userId || "GUEST";

  await prisma.conversationReadState.upsert({
    where: { conversationId_userId: { conversationId, userId: resolvedUserId } },
    update: { isFavorite },
    create: { conversationId, userId: resolvedUserId, isFavorite },
  });
  return { success: true };
}

export async function toggleConversationArchivedStatus(conversationId: string, isArchived: boolean, userId?: string) {
  if (!conversationId) return { success: false };
  const currentUser = await getCurrentUser();
  const resolvedUserId = currentUser?.id || userId || "GUEST";

  await prisma.conversationReadState.upsert({
    where: { conversationId_userId: { conversationId, userId: resolvedUserId } },
    update: { isArchived },
    create: { conversationId, userId: resolvedUserId, isArchived },
  });
  return { success: true };
}

export async function toggleConversationMutedStatus(conversationId: string, isMuted: boolean, userId?: string) {
  if (!conversationId) return { success: false };
  const currentUser = await getCurrentUser();
  const resolvedUserId = currentUser?.id || userId || "GUEST";

  await prisma.conversationReadState.upsert({
    where: { conversationId_userId: { conversationId, userId: resolvedUserId } },
    update: { isMuted },
    create: { conversationId, userId: resolvedUserId, isMuted },
  });
  return { success: true };
}

export async function clearConversationMessages(conversationId: string) {
  try {
    await prisma.message.deleteMany({
      where: { conversationId }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    await prisma.conversationReadState.deleteMany({
      where: { conversationId }
    });
    await prisma.message.deleteMany({
      where: { conversationId }
    });
    await prisma.conversation.delete({
      where: { id: conversationId }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function markMessageStatus(messageId: string, status: 'DELIVERED' | 'READ') {
  try {
    const message = await prisma.message.update({
      where: { id: messageId },
      data: { 
        status,
        isRead: status === 'READ' ? true : undefined
      }
    });

    await pusherServer.trigger(`conversation-${message.conversationId}`, "message-status-updated", {
      messageId: message.id,
      status,
      conversationId: message.conversationId,
    });

    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function notifyTyping(conversationId: string, isTyping: boolean) {
  try {
    const user = await getCurrentUser();
    const event = isTyping ? "user-typing" : "user-stop-typing";
    await pusherServer.trigger(`conversation-${conversationId}`, event, {
      userId: user?.id || "GUEST",
      userName: user?.name || "Guest",
      conversationId,
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function updateUserStatus(isOnline: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    const lastSeen = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline, lastSeen }
    });

    await pusherServer.trigger("user-status", "status-changed", {
      userId: user.id,
      email: user.email,
      name: user.name,
      isOnline,
      lastSeen: lastSeen.toISOString(),
    });

    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
