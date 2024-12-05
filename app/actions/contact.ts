"use server";

import { PrismaClient } from "@prisma/client";
import { contactSchema } from "@/lib/schema";
import { Twilio } from "twilio";

const prisma = new PrismaClient();
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

export async function submitContact(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  try {
    const validatedData = contactSchema.parse(rawData);

    // Save to database
    await prisma.contact.create({
      data: validatedData,
    });

    // Send WhatsApp message to admin
    // const adminMessage = `
    //   New Contact Form Submission:
    //   - Name: ${validatedData.name}
    //   - Email: ${validatedData.email}
    //   - Message: ${validatedData.message}
    // `;
    // await twilioClient.messages.create({
    //   from: "whatsapp:+6281234225300",
    //   to: "whatsapp:+6282233528492",
    //   body: adminMessage,
    // });

    // // Send confirmation to sender
    // const senderMessage = `
    //   Hi ${validatedData.name},
    //   Thank you for your message. We have received your submission and will get back to you soon.
    // `;
    // await twilioClient.messages.create({
    //   from: "whatsapp:+6281234225300",
    //   to: "whatsapp:+6282233528492",
    //   body: senderMessage,
    // });

    return { success: true };
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return {
      success: false,
      error: "An error occurred while submitting the form.",
    };
  }
}
