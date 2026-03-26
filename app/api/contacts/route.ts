import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: contacts });
  } catch (error) {
    console.error("API Fetch Contacts Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
