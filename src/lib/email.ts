import { Resend } from "resend";
import { STEPS, type FormData } from "@/lib/questions";

/**
 * Resend email alert for new onboarding submissions. Server-only.
 *
 * Env is read lazily inside the function so importing this module never throws
 * and `next build` stays green when the email vars aren't set. If RESEND_API_KEY
 * or LEAD_ALERT_TO is missing, we log and return — this must NEVER block or fail
 * the form submission.
 */

const FROM = "4Pie Labs <noreply@mail.fourpielabs.com>";
const REPLY_TO = "team@fourpielabs.com";

const NOT_ANSWERED = "— not answered —";

// Brand tokens (inline so email clients render them reliably).
const BG = "#0a0a0a";
const SURFACE = "#141414";
const BORDER = "#2a2a2a";
const TEXT = "#f5f5f5";
const MUTED = "#a3a3a3";
const ACCENT = "#f59e0b";

export interface OnboardingAlertData {
  businessName: string | null;
  contactName: string | null;
  submissionDate: string | null;
  /** Flat responses keyed by stable field id (same shape stored in Supabase). */
  responses: FormData;
}

/** The four content sections (everything except the intro step). */
const SECTIONS = STEPS.filter((s) => !s.isIntro);

export async function sendOnboardingAlert(data: OnboardingAlertData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info("[onboarding] RESEND_API_KEY not set — skipping email alert.");
    return;
  }

  const to = (process.env.LEAD_ALERT_TO ?? "")
    .split(",")
    .map((addr) => addr.trim())
    .filter(Boolean);
  if (to.length === 0) {
    console.info("[onboarding] LEAD_ALERT_TO not set — skipping email alert.");
    return;
  }

  const businessName = data.businessName?.trim() || "New submission";

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject: `New client onboarding — ${businessName}`,
      html: renderHtml(data),
    });
    if (error) {
      console.error("[onboarding] Resend returned an error:", error);
    }
  } catch (err) {
    console.error("[onboarding] Resend send threw:", err);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function answerHtml(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return `<span style="color:${MUTED};font-style:italic;">${NOT_ANSWERED}</span>`;
  }
  // Preserve user line breaks in the email body.
  return escapeHtml(trimmed).replace(/\n/g, "<br />");
}

function renderHtml(data: OnboardingAlertData): string {
  const headerMeta = [data.contactName, data.submissionDate]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .map(escapeHtml)
    .join("&nbsp;&nbsp;·&nbsp;&nbsp;");

  const sectionsHtml = SECTIONS.map((section) => {
    const rows = section.fields
      .map(
        (field) => `
        <tr>
          <td style="padding:14px 0;border-top:1px solid ${BORDER};">
            <div style="font-size:13px;color:${MUTED};margin:0 0 6px;">${escapeHtml(
              field.label,
            )}</div>
            <div style="font-size:15px;color:${TEXT};line-height:1.5;">${answerHtml(
              data.responses[field.id],
            )}</div>
          </td>
        </tr>`,
      )
      .join("");

    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${ACCENT};color:${BG};font-weight:700;font-size:13px;border-radius:6px;padding:4px 9px;">${escapeHtml(
                  section.index,
                )}</td>
                <td style="padding-left:10px;font-size:18px;font-weight:700;color:${TEXT};">${escapeHtml(
                  section.title,
                )}</td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              ${rows}
            </table>
          </td>
        </tr>
      </table>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:${BG};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:92%;background:${SURFACE};border:1px solid ${BORDER};border-radius:16px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td>
                <div style="font-size:18px;font-weight:700;color:${TEXT};">4Pie<span style="color:${ACCENT};">.</span> <span style="font-size:11px;letter-spacing:3px;color:${MUTED};text-transform:uppercase;">Labs</span></div>
                <div style="margin-top:20px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${ACCENT};">New client onboarding</div>
                <div style="margin-top:6px;font-size:26px;font-weight:700;color:${TEXT};line-height:1.2;">${escapeHtml(
                  data.businessName?.trim() || "New submission",
                )}</div>
                ${
                  headerMeta
                    ? `<div style="margin-top:8px;font-size:14px;color:${MUTED};">${headerMeta}</div>`
                    : ""
                }
                ${sectionsHtml}
                <div style="margin-top:32px;padding-top:16px;border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};">
                  Sent automatically from the 4Pie Labs client onboarding form.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
