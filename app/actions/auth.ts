"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/email";
import * as bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity-log";
import ImageKit from "@imagekit/nodejs";

const prisma = new PrismaClient();

/**
 * Login using email and password
 */
export async function loginWithPassword(email: string, password: string) {
  if (!email || !password) return { success: false, error: "Email and password are required" };

  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { role: true },
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

    await logActivity({
      userId: user.id,
      action: "LOGIN",
      description: "Login dengan email dan password berhasil.",
      route: "/login",
      method: "SERVER_ACTION",
    });

    return { 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role.name } 
    };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: "An error occurred. Please try again." };
  }
}

/**
 * Request an OTP for login or registration
 */
export async function requestOTP(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
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

    // const result = await sendEmail({ to: email, subject, html });
    // if (!result.success) {
    //   return { success: false, error: "Failed to send OTP email." };
    // }

    return { success: true, message: "OTP generated. Please contact admin for your code." };
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
      include: { role: true },
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
        include: { role: true },
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

    await logActivity({
      userId: user!.id,
      action: "LOGIN_OTP",
      description: "Login/verifikasi OTP berhasil.",
      route: "/login",
      method: "SERVER_ACTION",
    });

    return { 
      success: true, 
      user: { id: user!.id, email: user!.email, name: user!.name, role: user!.role.name } 
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
    let userRole = await prisma.role.findUnique({ where: { name: "User" } });
    if (!userRole) {
      userRole = await prisma.role.create({ data: { name: "User" } });
    }

    const user = await prisma.user.findFirst({
      where: { email, roleId: userRole.id }
    });
    if (!user) {
      return { success: false, error: "No user found with this email" };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.verificationToken.upsert({
      where: { email_token: { email, token: otp } },
      update: { expires },
      create: { email, token: otp, expires },
    });

    /*
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
    */

    return { success: true, message: "Reset code generated. Please contact admin for your code." };
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

    let userRole = await prisma.role.findUnique({ where: { name: "User" } });
    if (!userRole) {
      userRole = await prisma.role.create({ data: { name: "User" } });
    }

    const hashedPassword = await bcrypt.hash(newPw, 10);
    await prisma.user.updateMany({
      where: { email, roleId: userRole.id },
      data: { password: hashedPassword }
    });

    await prisma.verificationToken.delete({ where: { id: vt.id } });

    const updatedUsers = await prisma.user.findMany({
      where: { email, roleId: userRole.id },
      select: { id: true },
    });

    for (const updatedUser of updatedUsers) {
      await logActivity({
        userId: updatedUser.id,
        action: "PASSWORD_CHANGED",
        description: "Password diubah melalui OTP reset password.",
        route: "/login",
        method: "SERVER_ACTION",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Reset Password Error:", error);
    return { success: false, error: "Failed to reset password." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;

  if (userId) {
    await logActivity({
      userId,
      action: "LOGOUT",
      description: "Logout dari dashboard.",
      route: "/dashboard",
      method: "SERVER_ACTION",
    });
  }

  cookieStore.delete("portfolio_session");
  return { success: true };
}

export async function getTotalMessageCount() {
  try {
    const totalMessages = await prisma.message.count({
      where: {
        OR: [{ isAdmin: false }, { isAdmin: true }],
      },
    });

    return { success: true, totalMessages };
  } catch (error) {
    console.error("Get Total Message Count Error:", error);
    return { success: false, totalMessages: 0 };
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;
  if (!userId) return null;

  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        twoFactorEnabled: true, 
        role: true, 
        mfaDismissedAt: true,
        UserImage: true 
      },
    });
  } catch (error) {
    return null;
  }
}

export async function updateAvatar({
  imageUrl,
  fileBase64,
  fileName,
}: {
  imageUrl?: string;
  fileBase64?: string;
  fileName?: string;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    let finalUrl = imageUrl?.trim() || "";
    let fileId: string | null = null;
    let source = "url";

    if (fileBase64 && fileName) {
      const imagekit = new ImageKit({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
      });

      const uploadRes = await imagekit.files.upload({
        file: fileBase64,
        fileName: fileName,
        folder: "/avatars",
        useUniqueFileName: true,
      });

      finalUrl = uploadRes.url || "";
      fileId = uploadRes.fileId || null;
      source = "imagekit";
    }

    if (!finalUrl) {
      return { success: false, error: "Image URL or file is required" };
    }

    const userImage = await prisma.userImage.upsert({
      where: { userId },
      update: {
        imageUrl: finalUrl,
        fileId: fileId ?? null,
        source,
      },
      create: {
        id: `usr-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        imageUrl: finalUrl,
        fileId: fileId ?? null,
        source,
      },
    });

    await logActivity({
      userId,
      action: "AVATAR_UPDATED",
      description: `Avatar profil diperbarui via ${source}.`,
      route: "/dashboard/profile",
      method: "SERVER_ACTION",
    });

    return { success: true, userImage };
  } catch (error: any) {
    console.error("Update Avatar Error:", error);
    return { success: false, error: error.message || "Failed to update avatar." };
  }
}

export async function updateCurrentUserFullName(fullName: string) {
  const trimmedName = fullName?.trim();
  if (!trimmedName) {
    return { success: false, error: "Full name is required" };
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name: trimmedName },
      select: { id: true, name: true, email: true },
    });

    await logActivity({
      userId,
      action: "PROFILE_NAME_CHANGED",
      description: `Nama diubah dari "${existingUser?.name || "-"}" menjadi "${updatedUser.name || "-"}".`,
      route: "/dashboard/profile",
      method: "SERVER_ACTION",
    });

    return { success: true, user: updatedUser };
  } catch (error) {
    console.error("Update Full Name Error:", error);
    return { success: false, error: "Failed to update full name." };
  }
}

export async function changePassword({
  currentPassword,
  newPassword,
}: {
  currentPassword?: string;
  newPassword?: string;
}) {
  if (!currentPassword || !newPassword) {
    return { success: false, error: "Password saat ini dan password baru harus diisi" };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "Password baru minimal 6 karakter" };
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get("portfolio_session")?.value;
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User tidak ditemukan" };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { success: false, error: "Password saat ini salah" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await logActivity({
      userId,
      action: "PASSWORD_CHANGED",
      description: "Password berhasil diubah melalui halaman settings/password.",
      route: "/dashboard/settings/password",
      method: "SERVER_ACTION",
    });

    return { success: true };
  } catch (error) {
    console.error("Change Password Error:", error);
    return { success: false, error: "Gagal memperbarui password" };
  }
}

export async function getVerificationTokens() {
  const user = await getCurrentUser();
  if (!user || (user.role as any).name !== "Admin") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const tokens = await prisma.verificationToken.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, tokens: JSON.parse(JSON.stringify(tokens)) };
  } catch (error) {
    console.error("Fetch OTP Error:", error);
    return { success: false, error: "Failed to fetch OTPs" };
  }
}
