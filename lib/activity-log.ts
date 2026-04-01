"use server";

import { Prisma, PrismaClient } from "@prisma/client";
import { headers } from "next/headers";

type LogActivityPayload = {
  userId?: string | null;
  action: string;
  description?: string;
  route?: string;
  method?: string;
  metadata?: Prisma.InputJsonValue;
};

const prisma = new PrismaClient();

function detectDeviceType(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (!ua) return "Unknown";
  if (ua.includes("tablet") || ua.includes("ipad")) return "Tablet";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "Mobile";
  return "Desktop";
}

function resolveLocation(h: Headers) {
  const city = h.get("x-vercel-ip-city");
  const region = h.get("x-vercel-ip-country-region");
  const country = h.get("x-vercel-ip-country");
  return [city, region, country].filter(Boolean).join(", ") || "Unknown";
}

export async function logActivity(payload: LogActivityPayload) {
  try {
    const h = await headers();
    const userAgent = h.get("user-agent") || "Unknown";
    const forwarded = h.get("x-forwarded-for");
    const realIp = h.get("x-real-ip");
    const ipAddress = forwarded?.split(",")[0]?.trim() || realIp || "Unknown";

    await prisma.historyActivityUser.create({
      data: {
        userId: payload.userId,
        action: payload.action,
        description: payload.description,
        route: payload.route,
        method: payload.method,
        ipAddress,
        deviceType: detectDeviceType(userAgent),
        userAgent,
        location: resolveLocation(h),
        metadata: payload.metadata,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
