"use server";

import { Resend } from "resend";
import { PrismaClient } from "@prisma/client";
import { contactSchema } from "@/lib/schema";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitContact(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());

  try {
    const validatedData = contactSchema.parse(rawData);

    // Save to database
    await prisma.contact.create({
      data: validatedData,
    });

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "taufaniafrinda21@gmail.com",
      subject: "New Contact Form Submission",
      html: `
        <h1>New Contact Form Submission</h1>
        <p><strong>Name:</strong> ${validatedData.name}</p>
        <p><strong>Email:</strong> ${validatedData.email}</p>
        <p><strong>Message:</strong> ${validatedData.message}</p>
        `,
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return {
      success: false,
      error: "An error occurred while submitting the form.",
    };
  }
}
