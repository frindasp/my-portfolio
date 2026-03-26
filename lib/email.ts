import nodemailer from "nodemailer";
import { APP_CONFIG } from "./constants";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  // Try SMTP (e.g. Gmail) if configured
  if (APP_CONFIG.email.smtp.user && APP_CONFIG.email.smtp.pass) {
    const transporter = nodemailer.createTransport({
      host: APP_CONFIG.email.smtp.host,
      port: APP_CONFIG.email.smtp.port,
      secure: APP_CONFIG.email.smtp.port === 465,
      auth: {
        user: APP_CONFIG.email.smtp.user,
        pass: APP_CONFIG.email.smtp.pass,
      },
    });

    try {
      await transporter.sendMail({
        from: `"${APP_CONFIG.email.smtp.user}" <${APP_CONFIG.email.smtp.user}>`,
        to,
        subject,
        html,
      });
      console.log("Email sent successfully via SMTP");
      return { success: true };
    } catch (error) {
      console.error("SMTP Error:", error);
    }
  }

  return { success: false, error: "No email provider configured or all failed" };
}
