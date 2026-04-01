import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { logActivity } from "@/lib/activity-log";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log(">>> Incoming Webhook Type:", payload.type);
    
    // Resend payloads usually have the main data at the root or under 'data'
    const data = payload.data || payload;
    
    // Default mapped fields (adjust according to the actual structure)
    // Sometimes webhook provides `from`, `to`, `subject` directly in `data`
    // Sometimes it provides `from` as a string, `to` as an array or string
    const fromStr = typeof data.from === 'string' ? data.from : JSON.stringify(data.from);
    let toStr = "";
    if (typeof data.to === 'string') {
      toStr = data.to;
    } else if (Array.isArray(data.to)) {
      toStr = data.to.join(", ");
    } else if (data.to) {
      toStr = JSON.stringify(data.to);
    }
    
    const subjectStr = typeof data.subject === 'string' ? data.subject : null;
    const textStr = typeof data.text === 'string' ? data.text : null;
    const htmlStr = typeof data.html === 'string' ? data.html : null;

    // Save to the database
    await prisma.webhookEmail.create({
      data: {
        from: fromStr || null,
        to: toStr || null,
        subject: subjectStr,
        text: textStr,
        html: htmlStr,
        rawData: payload, // Store the raw JSON payload
      },
    });

    await logActivity({
      action: "API_HIT",
      description: "POST /api/webhook",
      route: "/api/webhook",
      method: "POST",
      metadata: { type: payload.type || "unknown" },
    });

    return NextResponse.json({ success: true, message: "Webhook processed and saved" }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ success: false, error: "Failed to process webhook" }, { status: 500 });
  }
}
