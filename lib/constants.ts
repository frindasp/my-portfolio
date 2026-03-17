export const APP_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5009",
  email: {
    from: process.env.RESEND_FROM || "onboarding@resend.dev",
    recipient: process.env.CONTACT_EMAIL_RECIPIENT || "taufaniafrinda21@gmail.com",
    resendApiKey: process.env.RESEND_API_KEY,
  },
} as const;
