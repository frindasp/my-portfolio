"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/email";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Login using email and password
 */
export async function loginWithPassword(email: string, password: string) {
  if (!email || !password) return { success: false, error: "Email and password are required" };

  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { Role: true },
    });

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, error: "Invalid email or password" };
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("portfolio_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });

    return { 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name, role: user.Role.name } 
    };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

/**
 * Request an OTP for login or registration
 */
export async function requestOTP(email: string) {
  if (!email) return { success: false, error: "Email is required" };

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await prisma.verificationToken.upsert({
      where: {
        email_token: { email, token: otp },
      },
      update: { expires },
      create: { email, token: otp, expires },
    });

    const subject = "✨ Your Login OTP for Portfolio";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Welcome!</h2>
        <p style="font-size: 16px; color: #555;">Use the following 6-digit code to complete your login or registration:</p>
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes.</p>
      </div>
    `;

    const result = await sendEmail({ to: email, subject, html });
    if (!result.success) {
      return { success: false, error: "Failed to send OTP email." };
    }

    return { success: true };
  } catch (error) {
    console.error("OTP Request Error:", error);
    return { success: false, error: "An error occurred." };
  }
}

/**
 * Verify OTP and login/register
 */
export async function verifyOTP(email: string, token: string) {
  if (!email || !token) return { success: false, error: "Email and OTP are required" };

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { email_token: { email, token } },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return { success: false, error: "Invalid or expired OTP" };
    }

    let userRole = await prisma.role.findUnique({ where: { name: "User" } });
    if (!userRole) {
      userRole = await prisma.role.create({ data: { name: "User" } });
    }

    let user = await prisma.user.findFirst({
      where: { email, roleId: userRole.id },
      include: { Role: true },
    });

    if (!user) {
      // Create new user with hashed placeholder (otp-users don't use it, but schema requires it)
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
      user = (await prisma.user.create({
        data: {
          email,
          roleId: userRole.id,
          password: hashedPassword,
          name: email.split("@")[0],
        },
        include: { Role: true },
      })) as any;
    }

    await prisma.verificationToken.delete({ where: { id: verificationToken.id } });

    const cookieStore = await cookies();
    cookieStore.set("portfolio_session", user!.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return { 
      success: true, 
      user: { id: user!.id, email: user!.email, name: user!.name, role: user!.Role.name } 
    };
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return { success: false, error: "An error occurred." };
  }
}

/**
 * Request password reset (Lupa Password)
 */
export async function forgotPassword(email: string) {
  if (!email) return { success: false, error: "Email is required" };

  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      // Don't reveal if user exists, but for simple MVP we can be direct
      return { success: false, error: "No user found with this email" };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.verificationToken.upsert({
      where: { email_token: { email, token: otp } },
      update: { expires },
      create: { email, token: otp, expires },
    });

    await sendEmail({
      to: email,
      subject: "🔑 Password Reset OTP",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Use the code below:</p>
          <div style="font-size: 24px; font-weight: bold; margin: 20px 0;">${otp}</div>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return { success: false, error: "Failed to process request." };
  }
}

/**
 * Reset password using OTP
 */
export async function resetPassword(email: string, token: string, newPw: string) {
  if (!email || !token || !newPw) return { success: false, error: "All fields are required" };

  try {
    const vt = await prisma.verificationToken.findUnique({
      where: { email_token: { email, token } }
    });

    if (!vt || vt.expires < new Date()) {
      return { success: false, error: "Invalid or expired OTP" };
    }

    const hashedPassword = await bcrypt.hash(newPw, 10);
    await prisma.user.updateMany({
      where: { email },
      data: { password: hashedPassword }
    });

    await prisma.verificationToken.delete({ where: { id: vt.id } });

    return { success: true };
  } catch (error) {
    console.error("Reset Password Error:", error);
    return { success: false, error: "Failed to reset password." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("portfolio_session");
  return { success: true };
}

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
