import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/auth";
import { logActivity } from "@/lib/activity-log";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await logActivity({
      userId: user.id,
      action: "API_HIT",
      description: "GET /api/contacts",
      route: "/api/contacts",
      method: "GET",
    });

    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: contacts });
  } catch (error) {
    console.error("API Fetch Contacts Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
