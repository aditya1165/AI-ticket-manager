// SendGrid-only mailer. SMTP/nodemailer removed — use a provider API key.

function parseFrom(rawFrom) {
  const fromAddress = (rawFrom || '"Ticket.io" <no-reply@example.com>').trim();
  const m = fromAddress.match(/^(?:"?([^"<]+)"?\s*)?<([^>]+)>$/);
  if (m) return { name: m[1] ? m[1].trim() : undefined, email: m[2].trim(), raw: fromAddress };
  // fallback: try to split
  const parts = fromAddress.split("<");
  if (parts.length === 2) return { name: parts[0].replace(/"/g, "").trim(), email: parts[1].replace(/>/g, "").trim(), raw: fromAddress };
  return { raw: fromAddress, email: fromAddress.replace(/"/g, "") };
}

export const sendMail = async (to, subject, text, html) => {
  const provider = (process.env.MAIL_API_PROVIDER || "").toLowerCase();
  const fromRaw = process.env.MAIL_FROM || '"Ticket.io" <no-reply@example.com>';
  const from = parseFrom(fromRaw);

  // helper: normalize recipients to array of objects {email}
  const toArray = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) return input.map((t) => ({ email: String(t).trim() }));
    // allow comma separated or semicolon separated
    return String(input).split(/[;,]+/).map((t) => ({ email: t.trim() })).filter((x) => x.email);
  };

  // Only SendGrid provider is supported now
  const apiKey = process.env.MAIL_API_KEY || process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("MAIL_API_KEY / SENDGRID_API_KEY not set");

  const recipients = toArray(to);
  if (recipients.length === 0) throw new Error("No recipients specified for sendMail");

  const mailHost = process.env.MAIL_API_HOST || "https://api.sendgrid.com/v3/mail/send";
  const replyToRaw = process.env.MAIL_REPLY_TO;
  const replyTo = replyToRaw ? parseFrom(replyToRaw) : undefined;

  const payload = {
    personalizations: [
      {
        to: recipients,
      },
    ],
    from: { email: from.email, name: from.name || "" },
    subject: subject || "",
    content: [],
  };

  if (html) payload.content.push({ type: "text/html", value: html });
  if (text) payload.content.push({ type: "text/plain", value: text });
  if (payload.content.length === 0) payload.content.push({ type: "text/plain", value: subject || "" });

  if (replyTo && replyTo.email) payload.reply_to = { email: replyTo.email, name: replyTo.name || undefined };

  try {
    const res = await fetch(mailHost, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`SendGrid API error ${res.status}: ${body}`);
      console.error(err.message);
      throw err;
    }

    return { provider: "sendgrid", status: res.status };
  } catch (err) {
    console.error("❌ SendGrid send error:", err && err.message ? err.message : err);
    throw err;
  }
};
