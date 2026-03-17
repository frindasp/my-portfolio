"use server";

import { Resend } from "resend";
import { PrismaClient } from "@prisma/client";
import { contactSchema } from "@/lib/schema";
import { APP_CONFIG } from "@/lib/constants";

const prisma = new PrismaClient();
// Resend initialized inside the function to avoid build-time errors if API key is missing

export async function submitContact(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  try {
    if (!APP_CONFIG.email.resendApiKey) {
      throw new Error("RESEND_API_KEY is not defined");
    }
    const resend = new Resend(APP_CONFIG.email.resendApiKey);
    const validatedData = contactSchema.parse(rawData);

    // Save to database
    await prisma.contact.create({
      data: validatedData,
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #f3f4f6; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 32px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
            .content { padding: 32px; }
            .field-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
            .field-value { font-size: 16px; color: #111827; margin-bottom: 24px; line-height: 1.5; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #f3f4f6; }
            .footer { padding: 24px; text-align: center; font-size: 14px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Message Received</h1>
            </div>
            <div class="content">
              <div class="field-label">Name</div>
              <div class="field-value">${validatedData.name}</div>
              
              <div class="field-label">Email Address</div>
              <div class="field-value">${validatedData.email}</div>
              
              <div class="field-label">Message</div>
              <div class="field-value" style="white-space: pre-wrap;">${validatedData.message}</div>
            </div>
            <div class="footer">
              Sent from your Portfolio Website
            </div>
          </div>
        </body>
      </html>
    `;

    const toAdmin = await resend.emails.send({
      from: APP_CONFIG.email.from,
      to: APP_CONFIG.email.recipient,
      subject: `✨ New message from ${validatedData.name}`,
      html: emailHtml,
    });

    // Trigger webhook secara manual untuk pencatatan di DB
    try {
      const baseUrl = APP_CONFIG.baseUrl; 
      await fetch(`${baseUrl}/api/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            from: APP_CONFIG.email.from,
            to: APP_CONFIG.email.recipient,
            subject: `✨ New message from ${validatedData.name}`,
            html: emailHtml,
          },
        }),
      });
    } catch (webhookError) {
      console.error("Failed to trigger local webhook:", webhookError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return {
      success: false,
      error: "An error occurred while submitting the form.",
    };
  }
}
