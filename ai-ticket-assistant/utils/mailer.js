import nodemailer from "nodemailer";

export const sendMail = async (to, subject, text) => {
  try {
    const smtpHost = process.env.MAILTRAP_SMTP_HOST;
    const smtpPort = Number(process.env.MAILTRAP_SMTP_PORT) || 587;
    const smtpUser = process.env.MAILTRAP_SMTP_USER;
    const smtpPass = process.env.MAILTRAP_SMTP_PASS;

    // If MAIL_FROM has surrounding spaces (common mistake), trim it
    const rawFrom = process.env.MAIL_FROM || '"Ticket.io" <no-reply@example.com>';
    const fromAddress = rawFrom.trim();

    const secure = smtpPort === 465; // use TLS for 465

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    // Helpful debug: verify connection configuration before sending
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error("❌ Mail transporter verification failed:", verifyErr && verifyErr.message ? verifyErr.message : verifyErr);
      // continue - sendMail will surface the real error as well
    }

    // Extract bare email for envelope (e.g. from "Name <email@domain.com>")
    const envelopeFromMatch = fromAddress.match(/<([^>]+)>/);
    const envelopeFrom = envelopeFromMatch ? envelopeFromMatch[1] : fromAddress.replace(/"/g, '');

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text,
      envelope: { from: envelopeFrom, to },
    };

    const info = await transporter.sendMail(mailOptions);

    return info;
  } catch (error) {
    console.error("❌ Mail error", error && error.message ? error.message : error);
    if (error && error.response) console.error("SMTP response:", error.response);
    throw error;
  }
};
