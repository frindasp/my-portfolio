"use server";

import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";

const prisma = new PrismaClient();

const RP_ID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const RP_NAME = "Portfolio WebAuthn";
const ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5009";

/**
 * Helper to get current user ID from session
 */
async function getSessionUserId() {
  const cookieStore = await cookies();
  return cookieStore.get("portfolio_session")?.value;
}

/**
 * Generate Registration Options
 */
export async function generateRegistrationOptionsAction() {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { authenticators: true },
  });

  if (!user) return { success: false, error: "User not found" };

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: isoUint8Array.fromUTF8String(user.id),
    userName: user.email,
    userDisplayName: user.name || user.email,
    attestationType: "none",
    excludeCredentials: user.authenticators.map((auth) => ({
      id: auth.credentialID,
      type: "public-key",
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  // Store challenge in a cookie (short-lived)
  const cookieStore = await cookies();
  cookieStore.set("webauthn_registration_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 5, // 5 minutes
    path: "/",
  });

  return { success: true, options };
}

/**
 * Verify Registration
 */
export async function verifyRegistrationAction(body: RegistrationResponseJSON) {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("webauthn_registration_challenge")?.value;
  if (!expectedChallenge) return { success: false, error: "Challenge expired or not found" };

  try {
    const verification = (await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    })) as any;

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      const { id: credentialID, publicKey: credentialPublicKey, counter } = credential;

      await prisma.authenticator.create({
        data: {
          userId,
          credentialID,
          publicKey: Buffer.from(credentialPublicKey),
          counter: BigInt(counter),
          credentialDeviceType,
          credentialBackedUp,
          transports: JSON.stringify(body.response.transports || []),
        },
      });

      cookieStore.delete("webauthn_registration_challenge");
      return { success: true };
    }


    return { success: false, error: "Verification failed" };
  } catch (error: any) {
    console.error("WebAuthn Registration Error:", error);
    return { success: false, error: error.message || "An error occurred during verification" };
  }
}

/**
 * Fetch registered passkeys
 */
export async function fetchPasskeysAction() {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    const passkeys = await prisma.authenticator.findMany({
      where: { userId },
      select: {
        id: true,
        credentialID: true,
        credentialDeviceType: true,
        credentialBackedUp: true,
        transports: true,
        enabled: true,
      },
    });

    return { success: true, passkeys };
  } catch (error) {
    return { success: false, error: "Failed to fetch passkeys" };
  }
}

/**
 * Delete a passkey
 */
export async function deletePasskeyAction(id: string) {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    await prisma.authenticator.delete({
      where: { id, userId },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete passkey" };
  }
}

/**
 * Toggle a passkey's enabled state
 */
export async function togglePasskeyAction(id: string, enabled: boolean) {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    await prisma.authenticator.update({
      where: { id },
      data: { enabled },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to toggle passkey" };
  }
}

/**
 * Dismiss the MFA enrollment reminder for today
 */
export async function dismissMfaReminderAction() {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaDismissedAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to dismiss reminder" };
  }
}

/**
 * Toggle 2FA
 */
export async function toggleTwoFactorAction(enabled: boolean) {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  try {
    // If enabling, check if user has at least one passkey or TOTP
    if (enabled) {
      const pkCount = await prisma.authenticator.count({ where: { userId } });
      const totpCount = await prisma.totpAuthenticator.count({ where: { userId, enabled: true } });
      if (pkCount === 0 && totpCount === 0) {
        return { success: false, error: "You must register at least one Passkey or Authenticator App first." };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update 2FA status" };
  }
}

/**
 * Generate Authentication Options (for 2FA, Login, or Password Reset)
 */
export async function generateAuthenticationOptionsAction(email?: string) {
  let targetEmail = email;
  const loggedInUserId = await getSessionUserId();

  // If not logged in and no email provided, we use discoverable credentials (resident keys)
  if (!targetEmail && !loggedInUserId) {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: "preferred",
    });

    const cookieStore = await cookies();
    cookieStore.set("webauthn_auth_challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 5,
      path: "/",
    });

    return { success: true, options };
  }

  // If not provided, use current logged in user
  if (!targetEmail && loggedInUserId) {
    const user = await prisma.user.findUnique({ where: { id: loggedInUserId } });
    targetEmail = user?.email;
  }

  if (!targetEmail) return { success: false, error: "Email is required for this operation." };

  // Find user that actually has authenticators registered
  // (email is not unique alone — it's unique per roleId, so there could be multiple user records)
  const user = await prisma.user.findFirst({
    where: { 
      email: targetEmail,
      authenticators: { some: { enabled: true } },
    },
    include: { authenticators: { where: { enabled: true } } },
  });

  if (!user || user.authenticators.length === 0) {
    return { success: false, error: "No passkeys registered for this user." };
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: user.authenticators.map((auth) => ({
      id: auth.credentialID,
      type: "public-key",
      transports: auth.transports ? JSON.parse(auth.transports) : undefined,
    })),
    userVerification: "preferred",
  });

  const cookieStore = await cookies();
  cookieStore.set("webauthn_auth_challenge", options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 5,
    path: "/",
  });

  // Store target email for verification step
  cookieStore.set("webauthn_auth_email", targetEmail, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 5,
    path: "/",
  });

  return { success: true, options };
}


/**
 * Verify Authentication (for 2FA or Login bypass)
 */
export async function verifyAuthenticationAction(body: AuthenticationResponseJSON) {
  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("webauthn_auth_challenge")?.value;
  if (!expectedChallenge) return { success: false, error: "Challenge expired" };

  const loggedInUserId = await getSessionUserId();
  const authEmail = cookieStore.get("webauthn_auth_email")?.value;
  
  let user;
  if (loggedInUserId) {
    user = await prisma.user.findUnique({
      where: { id: loggedInUserId },
      include: { authenticators: { where: { enabled: true } }, Role: true },
    });
  } else if (authEmail) {
    user = await prisma.user.findFirst({
      where: { email: authEmail, authenticators: { some: { enabled: true } } },
      include: { authenticators: { where: { enabled: true } }, Role: true },
    });
  }

  // Fallback for Discoverable Credentials: find user by credentialId
  if (!user) {
    user = await prisma.user.findFirst({
      where: { authenticators: { some: { credentialID: body.id, enabled: true } } },
      include: { authenticators: { where: { enabled: true } }, Role: true },
    });
  }

  if (!user) return { success: false, error: "User not found for this passkey." };


  const authenticator = user.authenticators.find(
    (auth) => auth.credentialID === body.id
  );

  if (!authenticator) return { success: false, error: "Authenticator not found" };

  try {
    const verification = (await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
         id: authenticator.credentialID,
         publicKey: new Uint8Array(authenticator.publicKey as Buffer),
         counter: Number(authenticator.counter),
      }
    })) as any;

    if (verification.verified) {
      // Update counter
      await prisma.authenticator.update({
        where: { id: authenticator.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) },
      });

      cookieStore.delete("webauthn_auth_challenge");
      cookieStore.delete("webauthn_auth_email");

      // If not logged in, log them in now (Passkey-only login or Password Reset verification)
      if (!loggedInUserId) {
         cookieStore.set("portfolio_session", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
         });
      }

      return { 
        success: true, 
        user: { id: user.id, email: user.email, name: user.name, role: user.Role.name } 
      };
    }

    return { success: false, error: "Verification failed" };
  } catch (error: any) {
    console.error("WebAuthn Auth Error:", error);
    return { success: false, error: error.message || "An error occurred" };
  }
}
