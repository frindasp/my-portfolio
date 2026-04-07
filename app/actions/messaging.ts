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
 * Check if the email has ever contacted or is registered
 */
export async function checkEmailStatus(email: string) {
  const existingContact = await prisma.contact.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

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
    hasContacted: !!existingContact,
    lastContactName: existingContact?.name || null,
    isRegistered: !!registeredUser,
  };
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

    const isContact = await prisma.contact.findFirst({
      where: { email },
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
      isContact: !!isContact,
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
      include: { Role: true },
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
        role: user.Role.name,
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
      include: { Role: true },
    });
  } else {
    // Just find existing user
    user = await prisma.user.findUnique({
      where: {
        email_roleId: { email, roleId: userRole.id },
      },
      include: { Role: true },
    });
  }

  if (!user) {
    return {
      success: false,
      error: "User not found. Please register first.",
      isContact: !!(await prisma.contact.findFirst({ where: { email } })),
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

    const matchedContacts = await prisma.contact.findMany({
      where: { email },
      select: { id: true },
    });

    if (matchedContacts.length > 0) {
      await prisma.message.updateMany({
        where: {
          contactId: { in: matchedContacts.map((contact) => contact.id) },
          isAdmin: false,
          OR: [
            { senderId: null },
            {
              senderEmail: email,
              senderId: { not: user.id },
            },
          ],
        },
        data: {
          senderId: user.id,
          senderEmail: email,
        },
      });
    }

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
      role: user.Role.name,
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
      select: { id: true, email: true, name: true, Role: true },
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
      include: { User: { select: { name: true, email: true } } },
    });
  }

  if (!email && !userId) return [];

  const normalizedEmail = email?.trim().toLowerCase();
  const matchedContacts = normalizedEmail
    ? await prisma.contact.findMany({
        where: { email: normalizedEmail },
        select: {
          id: true,
          name: true,
          email: true,
          message: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const contactIds = matchedContacts.map((contact) => contact.id);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        ...(normalizedEmail ? [{ senderEmail: normalizedEmail }] : []),
        { senderId: userId },
        ...(contactIds.length ? [{ contactId: { in: contactIds } }] : []),
      ],
    },
    orderBy: { createdAt: "asc" },
    include: { User: { select: { name: true, email: true } } },
  });

  // Fallback: if a contact entry exists but has never been materialized to Message,
  // expose it in the chat list so user can review/match it first.
  const materializedContactIds = new Set(
    messages
      .filter((message) => message.contactId)
      .map((message) => message.contactId as string),
  );

  const contactBackfills = matchedContacts
    .filter((contact) => !materializedContactIds.has(contact.id))
    .map((contact) => ({
      id: `contact-${contact.id}`,
      content: `[Kontak] ${contact.message}`,
      senderId: userId || null,
      senderEmail: contact.email,
      contactId: contact.id,
      isAdmin: false,
      createdAt: contact.createdAt,
    }));

  return [...messages, ...contactBackfills].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  ) as any;
}


export async function getMessageOwnershipDiff(email?: string, userId?: string) {
  if (!email || !userId) {
    return { canSync: false, pendingCount: 0 };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const matchedContacts = await prisma.contact.findMany({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  const contactIdSet = new Set(matchedContacts.map((contact) => contact.id));
  const contactIds = Array.from(contactIdSet);

  const orphanContactCount = contactIds.length
    ? await prisma.contact.count({
        where: {
          id: { in: contactIds },
          Messages: {
            none: {
              isAdmin: false,
            },
          },
        },
      })
    : 0;

  const candidateMessages = await prisma.message.findMany({
    where: {
      isAdmin: false,
      OR: [
        { senderEmail: normalizedEmail },
        ...(contactIdSet.size
          ? [{ contactId: { in: contactIds }, senderEmail: null }]
          : []),
      ],
      AND: [
        {
          OR: [{ senderId: null }, { senderId: { not: userId } }],
        },
      ],
    },
    select: {
      id: true,
    },
  });
  const pendingCount = candidateMessages.length + orphanContactCount;

  return {
    canSync: pendingCount > 0,
    pendingCount,
  };
}

export async function syncMessageOwnership(email?: string, userId?: string) {
  if (!email || !userId) {
    return { success: false, updatedCount: 0, error: "Unauthorized" };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const matchedContacts = await prisma.contact.findMany({
    where: { email: normalizedEmail },
    select: { id: true, message: true, createdAt: true },
  });

  const contactIdSet = new Set(matchedContacts.map((contact) => contact.id));
  const contactIds = Array.from(contactIdSet);
  const candidateMessages = await prisma.message.findMany({
    where: {
      isAdmin: false,
      OR: [
        { senderEmail: normalizedEmail },
        ...(contactIdSet.size
          ? [{ contactId: { in: contactIds }, senderEmail: null }]
          : []),
      ],
      AND: [
        {
          OR: [{ senderId: null }, { senderId: { not: userId } }],
        },
      ],
    },
    select: {
      id: true,
    },
  });
  const messageIdsToClaim = candidateMessages.map((message) => message.id);

  if (messageIdsToClaim.length === 0) {
    const existingMessageContactIds = contactIds.length
      ? await prisma.message.findMany({
          where: {
            contactId: { in: contactIds },
            isAdmin: false,
          },
          select: { contactId: true },
        })
      : [];

    const existingSet = new Set(
      existingMessageContactIds
        .map((item) => item.contactId)
        .filter((id): id is string => !!id),
    );

    const contactsToMaterialize = matchedContacts.filter(
      (contact) => !existingSet.has(contact.id),
    );
    if (contactsToMaterialize.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    const created = await prisma.message.createMany({
      data: contactsToMaterialize.map((contact) => ({
        content: `[Kontak] ${contact.message}`,
        senderId: userId,
        senderEmail: normalizedEmail,
        contactId: contact.id,
        isAdmin: false,
        createdAt: contact.createdAt,
      })),
    });

    return { success: true, updatedCount: created.count };
  }

  const updated = await prisma.message.updateMany({
    where: {
      id: { in: messageIdsToClaim },
    },
    data: {
      senderId: userId,
      senderEmail: normalizedEmail,
    },
  });

  // Also materialize contacts that still do not have any user message row.
  const existingMessageContactIds = contactIds.length
    ? await prisma.message.findMany({
        where: {
          contactId: { in: contactIds },
          isAdmin: false,
        },
        select: { contactId: true },
      })
    : [];

  const existingSet = new Set(
    existingMessageContactIds
      .map((item) => item.contactId)
      .filter((id): id is string => !!id),
  );
  const contactsToMaterialize = matchedContacts.filter(
    (contact) => !existingSet.has(contact.id),
  );

  let createdCount = 0;
  if (contactsToMaterialize.length > 0) {
    const created = await prisma.message.createMany({
      data: contactsToMaterialize.map((contact) => ({
        content: `[Kontak] ${contact.message}`,
        senderId: userId,
        senderEmail: normalizedEmail,
        contactId: contact.id,
        isAdmin: false,
        createdAt: contact.createdAt,
      })),
    });
    createdCount = created.count;
  }

  return { success: true, updatedCount: updated.count + createdCount };
}

/**
 * Get all conversations for a user or all for admin
 */
export async function getConversations(email?: string, userId?: string) {
  const currentUser = await getCurrentUser();
  const resolvedEmail = (currentUser?.email || email)?.trim().toLowerCase();
  const resolvedUserId = currentUser?.id || userId || null;

  if (!resolvedEmail && !resolvedUserId && !currentUser) return [];

  const isAdmin = currentUser?.Role?.name === "Admin";

  if (isAdmin) {
    return await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        Message: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
  }

  return await prisma.conversation.findMany({
    where: { 
      OR: [
        { email: resolvedEmail || undefined },
        { Message: { some: { senderId: resolvedUserId || undefined } } }
      ]
    },
    orderBy: { updatedAt: "desc" },
    include: {
      Message: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getUnreadConversationCounts(email?: string, userId?: string) {
  const currentUser = await getCurrentUser();
  const resolvedEmail = (currentUser?.email || email)?.trim().toLowerCase();
  const resolvedUserId = currentUser?.id || userId || null;

  if (!resolvedEmail && !resolvedUserId) return {};

  // For each conversation, find the lastReadAt from ConversationReadState
  // or default to a very old date.
  const allConversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { email: resolvedEmail || undefined },
        { Message: { some: { senderEmail: resolvedEmail || undefined } } }
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
      userId: resolvedUserId || "GUEST", // Use email if no ID? Actually ID is better.
    }
  });

  const readStateMap = readStates.reduce<Record<string, Date>>((acc, s) => {
    acc[s.conversationId] = s.lastReadAt;
    return acc;
  }, {});

  const unreadMap: Record<string, number> = {};

  for (const convId of convIds) {
    const lastRead = readStateMap[convId] || new Date(0);
    const count = await prisma.message.count({
      where: {
        conversationId: convId,
        isAdmin: true, // User only cares about messages from Admin
        createdAt: { gt: lastRead }
      }
    });
    if (count > 0) unreadMap[convId] = count;
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
    update: { lastReadAt: new Date() },
    create: {
      conversationId,
      userId: resolvedUserId,
      lastReadAt: new Date(),
    }
  });

  return { success: true };
}


/**
 * Handle creation of a new conversation thread
 */
export async function createConversation(title: string, email?: string) {
  const currentUser = await getCurrentUser();
  const resolvedEmail = (currentUser?.email || email)?.trim().toLowerCase();

  if (!resolvedEmail) return { success: false, error: "Unauthorized or missing email" };

  try {
    const userRole = await getOrCreateRole("User");
    const conversation = await prisma.conversation.create({
      data: {
        email: resolvedEmail,
        name: currentUser?.name || resolvedEmail.split("@")[0] || "Guest",
        roleId: userRole.id,
        title: title || "New Conversation",
        updatedAt: new Date(),
      },
    });

    return { success: true, conversation };
  } catch (error) {
    console.error("Create Conversation Error:", error);
    return { success: false, error: "Failed to create conversation" };
  }
}

export async function updateConversationAlias(conversationId: string, userAlias?: string, adminAlias?: string) {
  try {
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        userAlias: userAlias !== undefined ? userAlias : undefined,
        adminAlias: adminAlias !== undefined ? adminAlias : undefined,
      },
    });
    return { success: true, conversation: updated };
  } catch (err) {
    console.error("Update Alias Error:", err);
    return { success: false, error: "Failed to update alias" };
  }
}


/**
 * Send a chat message.
 */
export async function sendChatMessage(
  content: string,
  email?: string,
  userId?: string,
  conversationId?: string,
  title?: string,
) {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    return { success: false, error: "Message is empty" };
  }

  const currentUser = await getCurrentUser();
  const resolvedEmail = (currentUser?.email || email)?.trim().toLowerCase();
  const resolvedSenderId = currentUser?.id || userId || null;
  const userRole = await getOrCreateRole("User");

  let matchedContactId: string | null = null;
  let activeConversationId = conversationId;

  // Resolve or create conversation if not provided
  if (!activeConversationId && resolvedEmail) {
    // If title is provided, try to find an existing one with that title or create new
    if (title) {
       // Check if a conversation with this email and title exists
       const existingConv = await prisma.conversation.findFirst({
         where: { email: resolvedEmail, title: title }
       });
       if (existingConv) {
         activeConversationId = existingConv.id;
       } else {
         const newConv = await prisma.conversation.create({
           data: {
             email: resolvedEmail,
             name: currentUser?.name || resolvedEmail.split("@")[0] || "Guest",
             roleId: userRole.id,
             title: title,
             updatedAt: new Date(),
           }
         });
         activeConversationId = newConv.id;
       }
    } else {
      // Find the latest conversation
      const latestConv = await prisma.conversation.findFirst({
        where: { email: resolvedEmail },
        orderBy: { updatedAt: "desc" }
      });
      if (latestConv) {
        activeConversationId = latestConv.id;
      } else {
        // Create a default one
        const defaultConv = await prisma.conversation.create({
          data: {
            email: resolvedEmail,
            name: currentUser?.name || resolvedEmail.split("@")[0] || "Guest",
            roleId: userRole.id,
            title: "General Chat",
            updatedAt: new Date(),
          }
        });
        activeConversationId = defaultConv.id;
      }
    }
  }

  if (resolvedEmail) {
    const latestContact = await prisma.contact.findFirst({
      where: { email: resolvedEmail },
      orderBy: { createdAt: "desc" },
    });

    if (latestContact) {
      if (latestContact.message.trim() === normalizedContent) {
        // We skip duplicate error for conversations to allow similar greetings in different threads
        // but still log it if needed. 
      }

      const updatedContact = await prisma.contact.update({
        where: { id: latestContact.id },
        data: {
          message: normalizedContent,
          name: currentUser?.name || latestContact.name,
        },
      });
      matchedContactId = updatedContact.id;
    } else {
      const createdContact = await prisma.contact.create({
        data: {
          email: resolvedEmail,
          message: normalizedContent,
          name: currentUser?.name || resolvedEmail.split("@")[0] || "Guest",
        },
      });
      matchedContactId = createdContact.id;
    }
  }

  const message = await (prisma.message.create as any)({
    data: {
      content: normalizedContent,
      senderEmail: resolvedEmail,
      senderId: resolvedSenderId,
      contactId: matchedContactId,
      conversationId: activeConversationId,
      isAdmin: currentUser?.Role?.name === "Admin",
    },
    include: {
      User: { select: { name: true, email: true } },
      Conversation: true,
    }
  });

  // Update conversation timestamp
  if (activeConversationId) {
    await prisma.conversation.update({
      where: { id: activeConversationId },
      data: { updatedAt: new Date() }
    });
  }

  // Trigger Pusher for Real-time
  try {
    const channel = activeConversationId ? `conversation-${activeConversationId}` : `user-${resolvedEmail?.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Prepare sender info for the frontend
    const isSenderAdmin = currentUser?.Role?.name === "Admin";
    let senderName = message.User?.name || message.senderEmail || "Guest";
    
    if (message.Conversation) {
      if (isSenderAdmin) {
        senderName = message.Conversation.adminAlias || message.User?.name || "Admin";
        senderName = `Admin - ${senderName}`;
      } else {
        senderName = message.Conversation.userAlias || message.User?.name || "User";
      }
    }

    const pusherMessage = {
      ...message,
      sender: { name: senderName },
      senderRole: isSenderAdmin ? "admin" : "user"
    };

    await pusherServer.trigger(channel, "new-message", pusherMessage);
    
    // Also notify some "global" channel for admin if they are on the conversation list
    await pusherServer.trigger("admin-notifications", "conversation-updated", {
      conversationId: activeConversationId,
      lastMessage: pusherMessage
    });
  } catch (pusherError) {
    console.error("Pusher Trigger Error:", pusherError);
  }

  await logActivity({
    userId: resolvedSenderId,
    action: "CHAT_MESSAGE_SENT",
    description: normalizedContent,
    route: "/dashboard/chat",
    method: "SERVER_ACTION",
    metadata: {
      messageId: message.id,
      conversationId: activeConversationId,
      isAdmin: currentUser?.Role?.name === "Admin",
    },
  });

  return { success: true, message };
}
export async function logout() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;

  if (userId) {
    await logActivity({
      userId,
      action: "LOGOUT",
      description: "Logout dari modul messaging.",
      route: "/dashboard",
      method: "SERVER_ACTION",
    });
  }

  cookieStore.delete("portfolio_session");
  return { success: true };
}
