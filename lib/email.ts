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
  // Try Brevo API if configured
  if (APP_CONFIG.email.brevoApiKey) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "api-key": APP_CONFIG.email.brevoApiKey,
        },
        body: JSON.stringify({
          sender: { 
            name: "Portfolio Chat", 
            email: APP_CONFIG.email.brevoFrom 
          },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html,
        }),
      });

      if (response.ok) {
        console.log("Email sent successfully via Brevo API");
        return { success: true };
      } else {
        const errorData = await response.json();
        console.error("Brevo API Error:", errorData);
        // continue to SMTP fallback
      }
    } catch (error) {
      console.error("Brevo API Exception:", error);
    }
  }

  // Try SMTP (e.g. Brevo SMTP or Gmail) if configured
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
