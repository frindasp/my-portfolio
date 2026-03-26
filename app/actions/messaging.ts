"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { getOrCreateRole } from "@/lib/roles";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

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
export async function sendVerificationOTP(email: string) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert token in VerificationToken model
  await prisma.verificationToken.upsert({
    where: { email_token: { email, token: otp } },
    update: { expires },
    create: { email, token: otp, expires },
  });

  const res = await sendEmail({
    to: email,
    subject: "✨ Verification Code for your Chat Portfolio",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
         <p>Your verification code is:</p>
         <h1 style="color: #6366f1; letter-spacing: 4px;">${otp}</h1>
         <p style="color: #888;">This code will expire in 10 minutes.</p>
      </div>
    `,
  });

  return res;
}

/**
 * Login with Password
 */
export async function loginWithPassword(email: string, password: string) {
  if (!email || !password) return { success: false, error: "Email and password are required" };

  try {
    const userRole = await getOrCreateRole("User");
    const user = await prisma.user.findUnique({
      where: {
        email_roleId: { email, roleId: userRole.id }
      },
      include: { Role: true }
    });

    if (!user) return { success: false, error: "Account not found or invalid password" };

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return { success: false, error: "Invalid password" };

    // Set session
    const cookieStore = await cookies();
    cookieStore.set("portfolio_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.Role.name } };
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
      include: { Role: true }
    });
  } else {
    // Just find existing user
    user = await prisma.user.findUnique({
      where: {
        email_roleId: { email, roleId: userRole.id },
      },
      include: { Role: true }
    });
  }

  if (!user) {
    return { success: false, error: "User not found. Please register first." };
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
      }
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

  return {
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.Role.name },
  };
}

/**
 * Forgot Password (Sends OTP for reset)
 */
export async function forgotPassword(email: string) {
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) return { success: false, error: "User not found" };

  const res = await sendVerificationOTP(email);
  return res;
}

/**
 * Reset Password using OTP
 */
export async function resetPassword(email: string, token: string, newPw: string) {
  const verification = await prisma.verificationToken.findUnique({
    where: { email_token: { email, token } },
  });

  if (!verification || verification.expires < new Date()) {
    return { success: false, error: "Invalid or expired OTP" };
  }

  const hashedPassword = await bcrypt.hash(newPw, 10);
  await prisma.user.updateMany({
    where: { email },
    data: { password: hashedPassword }
  });

  await prisma.verificationToken.delete({ where: { id: verification.id } });
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
 * Fetch messages for the user.
 */
export async function getMessages(email?: string, userId?: string) {
  if (!email && !userId) return [];

  const normalizedEmail = email?.trim().toLowerCase();
  const matchedContacts = normalizedEmail
    ? await prisma.contact.findMany({
        where: { email: normalizedEmail },
        select: { id: true, name: true, email: true, message: true, createdAt: true },
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
        ...(contactIdSet.size ? [{ contactId: { in: contactIds }, senderEmail: null }] : []),
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
        ...(contactIdSet.size ? [{ contactId: { in: contactIds }, senderEmail: null }] : []),
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

    const contactsToMaterialize = matchedContacts.filter((contact) => !existingSet.has(contact.id));
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
  const contactsToMaterialize = matchedContacts.filter((contact) => !existingSet.has(contact.id));

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
 * Send a chat message.
 */
export async function sendChatMessage(
  content: string,
  email?: string,
  userId?: string,
) {
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    return { success: false, error: "Message is empty" };
  }

  const currentUser = await getCurrentUser();
  const resolvedEmail = (currentUser?.email || email)?.trim().toLowerCase();
  const resolvedSenderId = currentUser?.id || userId || null;

  let matchedContactId: string | null = null;

  if (resolvedEmail) {
    const latestContact = await prisma.contact.findFirst({
      where: { email: resolvedEmail },
      orderBy: { createdAt: "desc" },
    });

    if (latestContact) {
      if (latestContact.message.trim() === normalizedContent) {
        return {
          success: false,
          duplicate: true,
          error: "Pesan yang sama sudah tersimpan di live chat.",
        };
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

    // Backfill ownership for both new and older contacts/messages with the same email.
    if (resolvedSenderId) {
      const matchedContacts = await prisma.contact.findMany({
        where: { email: resolvedEmail },
        select: { id: true },
      });

      const contactIds = matchedContacts.map((contact) => contact.id);
      await prisma.message.updateMany({
        where: {
          isAdmin: false,
          OR: [
            { senderEmail: resolvedEmail },
            ...(contactIds.length ? [{ contactId: { in: contactIds } }] : []),
          ],
          AND: [{ OR: [{ senderId: null }, { senderId: { not: resolvedSenderId } }] }],
        },
        data: {
          senderId: resolvedSenderId,
          senderEmail: resolvedEmail,
        },
      });
    }
  }

  const message = await (prisma.message.create as any)({
    data: {
      content: normalizedContent,
      senderEmail: resolvedEmail,
      senderId: resolvedSenderId,
      contactId: matchedContactId,
      isAdmin: false, // User sending message
    },
  });

  return { success: true, message };
}
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("portfolio_session");
  return { success: true };
}
