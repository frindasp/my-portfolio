import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log(">>> Incoming Webhook Payload:", JSON.stringify(payload, null, 2));

    // Check if the payload matches the typical shape for Resend webhook
    const data = payload.data || {};
    
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

    return NextResponse.json({ success: true, message: "Webhook processed and saved" }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ success: false, error: "Failed to process webhook" }, { status: 500 });
  }
}
