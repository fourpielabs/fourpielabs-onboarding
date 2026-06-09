"use server";

import { createServiceRoleClient } from "@/lib/supabase";
import { sendOnboardingAlert } from "@/lib/email";
import {
  ALL_FIELDS,
  HONEYPOT_FIELD,
  REQUIRED_FIELD_IDS,
  type FormData,
} from "@/lib/questions";

export interface SubmitResult {
  ok: boolean;
  /** Field ids that failed validation, if any. */
  errors?: string[];
  message?: string;
}

const ALLOWED_IDS = new Set(ALL_FIELDS.map((f) => f.id));

/**
 * Handle an onboarding submission.
 *
 * Runs server-side only, so the service-role key and webhook URL never reach
 * the browser. The DB insert is the priority; the webhook POST is best-effort.
 * Each side is wrapped so one failing does not block the other.
 */
export async function submitOnboarding(raw: FormData): Promise<SubmitResult> {
  // 1. Honeypot — if a bot filled the hidden field, pretend success and bail
  //    without saving or notifying anyone.
  if (raw[HONEYPOT_FIELD]) {
    return { ok: true };
  }

  // 2. Keep only known fields and trim everything.
  const responses: FormData = {};
  for (const field of ALL_FIELDS) {
    const value = raw[field.id];
    if (typeof value === "string") {
      responses[field.id] = value.trim();
    } else {
      responses[field.id] = "";
    }
  }

  // 3. Server-side validation of required fields.
  const errors = REQUIRED_FIELD_IDS.filter((id) => !responses[id]);
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      message: "Please fill in all required fields.",
    };
  }

  // Guard: responses jsonb is NOT NULL in the DB — ensure it's populated.
  if (Object.keys(responses).length === 0) {
    return { ok: false, message: "No responses to submit." };
  }

  const businessName = responses.business_name || null;
  const contactName = responses.contact_name || null;
  const submissionDate = responses.submission_date || null;

  // 4. Persist to Supabase (priority). Failure here makes the whole submit
  //    fail so the user can retry — we don't want to silently lose a lead.
  let dbOk = false;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("client_onboarding").insert({
      business_name: businessName,
      contact_name: contactName,
      submission_date: submissionDate,
      responses,
    });
    if (error) {
      console.error("[onboarding] DB insert failed:", error.message);
    } else {
      dbOk = true;
    }
  } catch (err) {
    console.error("[onboarding] DB insert threw:", err);
  }

  // 5. Best-effort email alert via Resend. The DB save above is the priority
  //    and has already completed; this is a side effect that must NEVER block
  //    or fail the submission. sendOnboardingAlert swallows its own errors, but
  //    we wrap defensively too.
  try {
    await sendOnboardingAlert({
      businessName,
      contactName,
      submissionDate,
      responses,
    });
  } catch (err) {
    console.error("[onboarding] Email alert threw:", err);
  }

  // 6. Best-effort webhook POST. Never blocks or fails the submission.
  //    Runs regardless of DB outcome so notifications still fire.
  await postWebhook({
    business_name: businessName,
    contact_name: contactName,
    submission_date: submissionDate,
    responses,
    // Marker so the receiver knows whether the row was stored.
    db_persisted: dbOk,
  });

  if (!dbOk) {
    return {
      ok: false,
      message: "We couldn't save your submission. Please try again in a moment.",
    };
  }

  return { ok: true };
}

/**
 * POST the payload to the configured webhook. If the URL isn't set, log and
 * skip gracefully — never throw.
 */
async function postWebhook(payload: unknown): Promise<void> {
  const url = process.env.ONBOARDING_WEBHOOK_URL;
  if (!url) {
    console.info("[onboarding] ONBOARDING_WEBHOOK_URL not set — skipping webhook.");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[onboarding] Webhook responded ${res.status}.`);
    }
  } catch (err) {
    console.error("[onboarding] Webhook POST failed:", err);
  }
}
