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

    const toAdmin = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "taufaniafrinda21@gmail.com",
      subject: "New Contact Form Submission",
      html: `
        <div class="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md space-y-4">
  <h1 class="text-2xl font-bold text-gray-800">New Contact Form Submission</h1>
  <p class="text-gray-600">
    <strong class="font-semibold text-gray-800">Name:</strong> 
    <span>${validatedData.name}</span>
  </p>
  <p class="text-gray-600">
    <strong class="font-semibold text-gray-800">Email:</strong> 
    <span>${validatedData.email}</span>
  </p>
  <p class="text-gray-600">
    <strong class="font-semibold text-gray-800">Message:</strong> 
    <span>${validatedData.message}</span>
  </p>
</div>`,
    });

    console.log('toAdmin', toAdmin)

    return { success: true };
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return {
      success: false,
      error: "An error occurred while submitting the form.",
    };
  }
}
