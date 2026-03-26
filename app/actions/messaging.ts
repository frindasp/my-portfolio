"use server";

import { PrismaClient, User, Message } from "@prisma/client";
import { APP_CONFIG } from "@/lib/constants";
import { getOrCreateRole } from "@/lib/roles";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Check if the email has ever sent a contact message 
 * or if it is already registered as a USER role.
 */
export async function checkEmailStatus(email: string) {
  const existingContact = await prisma.contact.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  const userRole = await getOrCreateRole("User");
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
 * Send OTP for email verification.
 */
export async function sendVerificationOTP(email: string) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.verificationToken.upsert({
    where: { email_token: { email, token: otp } },
    update: { expires },
    create: { email, token: otp, expires },
  });

  const res = await sendEmail({
    to: email,
    subject: "✨ Verification Code for your Chat Portfolio",
    html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`,
  });

  return res;
}

/**
 * Verify OTP and register/login as User role.
 * Even if the email is an Admin, it creates a separate User entry.
 */
export async function verifyOTPAndRegister(
  email: string,
  token: string,
  password?: string,
  name?: string
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
  
  // Registration logic
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.upsert({
      where: {
        email_roleId: {
          email,
          roleId: userRole.id,
        },
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
    });
    return { success: true, user: { id: user.id, name: user.name, email: user.email } };
  }

  // If password not provided, just verify identity for now (e.g. for existing users)
  const existingUser = await prisma.user.findUnique({
    where: {
      email_roleId: {
        email,
        roleId: userRole.id,
      },
    },
  });

  if (existingUser) {
    return { success: true, user: { id: existingUser.id, name: existingUser.name, email: existingUser.email } };
  }

  return { success: false, error: "User not found and no password provided for registration" };
}

/**
 * Fetch messages for the user.
 */
export async function getMessages(email?: string, userId?: string) {
  if (!email && !userId) return [];

  return await prisma.message.findMany({
    where: {
      OR: [
        { senderEmail: email },
        { senderId: userId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Send a chat message.
 */
export async function sendChatMessage(content: string, email?: string, userId?: string) {
  const message = await prisma.message.create({
    data: {
      content,
      senderEmail: email,
      senderId: userId,
      isAdmin: false, // User sending message
    },
  });

  return { success: true, message };
}
