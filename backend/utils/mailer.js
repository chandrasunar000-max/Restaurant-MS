import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true";

    if (!user || !pass) {
      console.warn("MAILER: Missing SMTP credentials (SMTP_USER/SMTP_PASS)");
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  const disabled = String(process.env.DISABLE_EMAIL || "false").toLowerCase() === "true";

  if (disabled) {
    console.log(`MAIL (disabled): to=${to}, subject=${subject}, text=${text}`);
    return { accepted: [to], messageId: "console-only" };
  }

  const from = process.env.MAIL_FROM || "OrderByQR <no-reply@orderbyqr.in>";
  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log("MAIL(SMTP) → Sent successfully:", info.messageId);
    return info;
  } catch (err) {
    console.error("MAIL(SMTP) error:", err?.message || err);
    throw err;
  }
}
