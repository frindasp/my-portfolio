"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/email";

const prisma = new PrismaClient();

/**
 * Request an OTP for login or registration
 */
export async function requestOTP(email: string) {
  if (!email) return { success: false, error: "Email is required" };

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Upsert the token
    await prisma.verificationToken.upsert({
      where: {
        email_token: { email, token: otp },
      },
      update: { expires },
      create: { email, token: otp, expires },
    });

    // Send the email
    const subject = "✨ Your Login OTP for Portfolio";
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Welcome!</h2>
        <p style="font-size: 16px; color: #555;">Use the following 6-digit code to complete your login or registration:</p>
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #888;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    const result = await sendEmail({ to: email, subject, html });

    if (!result.success) {
      return { success: false, error: "Failed to send OTP email. Please try again later." };
    }

    return { success: true };
  } catch (error) {
    console.error("OTP Request Error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

/**
 * Verify OTP and login/register the user
 */
export async function verifyOTP(email: string, token: string) {
  if (!email || !token) return { success: false, error: "Email and OTP are required" };

  try {
    // Check if token exists and is not expired
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { email_token: { email, token } },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return { success: false, error: "Invalid or expired OTP" };
    }

    // Success! Find or create the user
    // Get the 'User' role first
    let userRole = await prisma.role.findUnique({ where: { name: "User" } });
    if (!userRole) {
      userRole = await prisma.role.create({ data: { name: "User" } });
    }

    // Check if user already exists
    let user = await prisma.user.findFirst({
      where: { email, roleId: userRole.id },
    });

    if (!user) {
      // Create a user with a hashed placehold password since schema requires password
      // or we can use a randomized string for OTP-only users
      const randomPassword = Math.random().toString(36).slice(-8);
      user = await prisma.user.create({
        data: {
          email,
          roleId: userRole.id,
          password: randomPassword, // You might want to hash this properly with bcryptjs later
          name: email.split("@")[0],
        },
      });
    }

    // Clean up used token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Set simple session cookie
    const cookieStore = await cookies();
    cookieStore.set("portfolio_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 1 week
      path: "/",
    });

    return { success: true, user: { id: user.id, email: user.email, name: user.name } };
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return { success: false, error: "An error occurred during verification." };
  }
}

/**
 * Logout the user
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("portfolio_session");
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
      select: { id: true, email: true, name: true, roleId: true, Role: true },
    });
  } catch (error) {
    return null;
  }
}
