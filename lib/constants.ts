export const APP_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5009",
  email: {
    from: process.env.RESEND_FROM || "onboarding@resend.dev",
    recipient:
      process.env.CONTACT_EMAIL_RECIPIENT || "taufaniafrinda21@gmail.com",
    smtp: {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
} as const;
