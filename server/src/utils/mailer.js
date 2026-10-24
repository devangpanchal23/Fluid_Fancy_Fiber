import nodemailer from "nodemailer";

let transporter = null;
let customTransporter = null;
const DEFAULT_SPEC_SHEET_URL = "https://drive.google.com/file/d/1DZA2vWxAtDk6MavmxLi2nW2MRVPLQeBs/view?usp=sharing";

export function setTransporterForTesting(mock) {
  customTransporter = mock;
}

export function resetTransporterForTesting() {
  customTransporter = null;
  transporter = null;
}

function getSenderEmail() {
  return String(
    process.env.BROCHURE_SENDER_EMAIL ||
    process.env.EMAIL_USER ||
    process.env.NOTIFY_EMAIL ||
    process.env.SMTP_USER ||
    ""
  ).trim();
}

function getSenderPassword() {
  const rawPass =
    process.env.BROCHURE_SENDER_APP_PASSWORD ||
    process.env.BROCHURE_SENDER_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    "";
  return rawPass ? String(rawPass).replace(/["'\s]/g, "") : "";
}

function getTransporter() {
  if (customTransporter) return customTransporter;
  if (transporter) return transporter;
  const user = getSenderEmail();
  const pass = getSenderPassword();
  if (!user || !pass) return null;

  try {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000
    });
  } catch (err) {
    console.error("[mailer] Failed to create nodemailer transport:", err.message);
    transporter = null;
  }
  return transporter;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Best-effort: a submission must still succeed and save to MongoDB even if
// email sending fails or isn't configured — this NEVER throws or rejects.
export async function sendEnquiryNotification(enquiry) {
  try {
    if (!enquiry) return;
    const t = getTransporter();
    if (!t) {
      console.warn("[mailer] BROCHURE_SENDER_EMAIL/BROCHURE_SENDER_APP_PASSWORD not configured — skipping notification email.");
      return;
    }

    const to = process.env.NOTIFY_EMAIL || getSenderEmail();
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
          Submitted ${new Date(enquiry.createdAt || Date.now()).toLocaleString()} via fluidfancyenterprise.com
        </p>
      </div>
    `;

    await t.sendMail({
      from: `"Fluid Fancy Fibre — Website" <${getSenderEmail()}>`,
      to,
      replyTo: enquiry.email,
      subject,
      html
    });
  } catch (err) {
    transporter = null;
    console.error("[mailer] Failed to send enquiry notification:", err?.message || err);
  }
}

// Send the brochure to the visitor. Unlike the internal notification, this is
// part of the requested customer flow, so delivery failures reach the caller.
export async function sendSpecSheetEmail(enquiry) {
  const t = getTransporter();
  if (!t) throw new Error("Email delivery is not configured.");

  const url = String(process.env.SPEC_SHEET_URL || DEFAULT_SPEC_SHEET_URL).trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("SPEC_SHEET_URL must be a valid URL.");
  }
  if (parsedUrl.protocol !== "https:") throw new Error("SPEC_SHEET_URL must use HTTPS.");

  const lineName = enquiry.lineName || "our product range";
  try {
    await t.sendMail({
      from: `"Fluid Fancy Fibre" <${getSenderEmail()}>`,
      to: enquiry.email,
      subject: "Your Fluid Fancy Fibre specification brochure",
      text: `Thank you for your interest in ${lineName}.\n\nYour PDF spec sheet link: ${url}\n\nOpen this link in your browser to view the document.`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#17140f;max-width:560px">
          <h2 style="font-size:22px">Your specification brochure</h2>
          <p>Thank you for your interest in ${escapeHtml(lineName)}.</p>
          <p><strong>Your PDF spec sheet link:</strong><br><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>
          <p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;background:#17140f;color:#f4f0e8;text-decoration:none">Open the PDF spec sheet</a></p>
          <p>If the button does not work, copy the document link above into your browser.</p>
          <p>Reply to this email if you would like a quotation or have a question.</p>
        </div>
      `
    });
  } catch (err) {
    transporter = null;
    throw err;
  }
}

