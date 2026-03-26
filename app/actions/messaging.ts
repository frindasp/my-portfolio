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

  return await prisma.message.findMany({
    where: {
      OR: [{ senderEmail: email }, { senderId: userId }],
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Send a chat message.
 */
export async function sendChatMessage(
  content: string,
  email?: string,
  userId?: string,
) {
  const message = await (prisma.message.create as any)({
    data: {
      content,
      senderEmail: email,
      senderId: userId || null, 
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
