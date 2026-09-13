import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass }
  });
  return transporter;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Best-effort: a submission must still succeed and save to MongoDB even if
// email sending fails or isn't configured — this never throws.
export async function sendEnquiryNotification(enquiry) {
  const t = getTransporter();
  if (!t) {
    console.warn("[mailer] EMAIL_USER/EMAIL_PASS not set — skipping notification email.");
    return;
  }

  const to = process.env.NOTIFY_EMAIL || process.env.EMAIL_USER;
  const isSpec = enquiry.type === "spec";
  const subject = isSpec
    ? `Spec sheet request — ${enquiry.lineName || "General"}`
    : `New enquiry from ${enquiry.name || enquiry.email}`;

  const rows = [
    ["Type", isSpec ? "Spec sheet request" : "Contact enquiry"],
    ["Name", enquiry.name],
    ["Company", enquiry.company],
    ["Email", enquiry.email],
    ["Product line", enquiry.lineName],
    ["Message", enquiry.message]
  ].filter(([, v]) => v);

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #17140f;">
      <h2 style="margin: 0 0 16px;">${escapeHtml(subject)}</h2>
      <table cellpadding="6" cellspacing="0">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="color:#6a6357;vertical-align:top;"><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`
          )
          .join("")}
      </table>
      <p style="margin-top: 20px; color: #6a6357; font-size: 12px;">
        Submitted ${new Date(enquiry.createdAt || Date.now()).toLocaleString()} via fluidfancyfibre.com
      </p>
    </div>
  `;

  try {
    await t.sendMail({
      from: `"Fluid Fancy Fibre — Website" <${process.env.EMAIL_USER}>`,
      to,
      replyTo: enquiry.email,
      subject,
      html
    });
  } catch (err) {
    console.error("[mailer] Failed to send enquiry notification:", err.message);
  }
}
