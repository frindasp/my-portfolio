"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const prisma = new PrismaClient();

async function getSessionUserId() {
  const cookieStore = await cookies();
  return cookieStore.get("portfolio_session")?.value;
}

/**
 * Generate TOTP secret and QR code for setup
 */
export async function generateTOTPSetup(name: string = "Authenticator") {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };

  const totp = new OTPAuth.TOTP({
    issuer: "Portfolio OS",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  const secret = totp.secret.base32;
  const otpauthUrl = totp.toString();

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  // Create a new TOTP record (not enabled yet until verified)
  const record = await prisma.totpAuthenticator.create({
    data: { userId, name, secret, enabled: false },
  });

  return {
    success: true,
    totpId: record.id,
    secret,
    qrCodeDataUrl,
  };
}

/**
 * Verify TOTP code and enable authenticator
 */
export async function verifyAndEnableTOTP(totpId: string, code: string) {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };

  const totpRecord = await prisma.totpAuthenticator.findFirst({
    where: { id: totpId, userId },
  });
  if (!totpRecord) {
    return { success: false, error: "No TOTP setup in progress" };
  }

  const totp = new OTPAuth.TOTP({
    issuer: "Portfolio OS",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(totpRecord.secret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) {
    return { success: false, error: "Invalid code. Please try again." };
  }

  await prisma.totpAuthenticator.update({
    where: { id: totpId },
    data: { enabled: true },
  });

  return { success: true };
}

/**
 * Delete a TOTP authenticator
 */
export async function deleteTOTP(totpId: string) {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  await prisma.totpAuthenticator.deleteMany({
    where: { id: totpId, userId },
  });

  return { success: true };
}

/**
 * Fetch all TOTP authenticators for current user
 */
export async function fetchTOTPList() {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, items: [] };

  const items = await prisma.totpAuthenticator.findMany({
    where: { userId },
    select: { id: true, name: true, enabled: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return { success: true, items };
}

/**
 * Verify TOTP code during login (checks all enabled authenticators)
 */
export async function verifyTOTPCode(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };

  const totpRecords = await prisma.totpAuthenticator.findMany({
    where: { userId, enabled: true },
  });

  if (totpRecords.length === 0) {
    return { success: false, error: "TOTP not configured" };
  }

  // Try all enabled authenticators
  for (const record of totpRecords) {
    const totp = new OTPAuth.TOTP({
      issuer: "Portfolio OS",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(record.secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta !== null) {
      // Valid code found — set session
      const cookieStore = await cookies();
      cookieStore.set("portfolio_session", userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
      return { success: true };
    }
  }

  return { success: false, error: "Invalid authenticator code" };
}
