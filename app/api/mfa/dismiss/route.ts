import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("portfolio_session")?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const dismissedAtRaw = body?.dismissedAt;

    const dismissedAt =
      typeof dismissedAtRaw === "string" && !Number.isNaN(Date.parse(dismissedAtRaw))
        ? new Date(dismissedAtRaw)
        : new Date();

    await prisma.user.update({
      where: { id: userId },
      data: { mfaDismissedAt: dismissedAt },
    });

    await logActivity({
      userId,
      action: "MFA_REMINDER_DISMISSED",
      description: "User menunda aktivasi MFA selama 24 jam dari halaman login.",
      route: "/login",
      method: "API",
      metadata: {
        dismissedAtClient: typeof dismissedAtRaw === "string" ? dismissedAtRaw : null,
        dismissedAtStored: dismissedAt.toISOString(),
      },
    });

    return NextResponse.json({ success: true, dismissedAt: dismissedAt.toISOString() });
  } catch (error) {
    console.error("dismiss mfa route error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dismiss reminder" },
      { status: 500 },
    );
  }
}
