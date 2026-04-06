// mailer.js - Resend API version (no SMTP)
import { Resend } from "resend";

let resendClient = null;

function getClient() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY env variable");
    resendClient = new Resend(key);
  }
  return resendClient;
}

export async function sendMail({ to, subject, html, text }) {
  // Behavior like old code
  const disabled = String(process.env.DISABLE_EMAIL || "false").toLowerCase() === "true";

  if (disabled) {
    console.log(`MAIL (disabled): to=${to}, subject=${subject}, text=${text}`);
    return { accepted: [to], messageId: "console-only" };
  }

  const from = process.env.MAIL_FROM || "OrderByQR <no-reply@orderbyqr.in>";
  const client = getClient();

  try {
    console.log(`MAIL(API) → Sending to ${to}, subject: ${subject}`);

    const result = await client.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    console.log("MAIL(API) → Sent successfully:", result?.id);
    return result;
  } catch (err) {
    console.error("MAIL(API) error:", err?.message || err);
    throw err;
  }
}
