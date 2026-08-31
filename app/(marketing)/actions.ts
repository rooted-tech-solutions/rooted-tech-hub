"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendInquiryAlert } from "@/lib/email";
import { verifyTurnstile } from "@/lib/turnstile";

export type InquiryState = { error?: string; success?: boolean } | null;

function field(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function submitInquiry(
  _prevState: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  // Layer 1: honeypot. A hidden field no human ever sees, let alone fills.
  // Report success so a bot has no signal that it was caught.
  if (field(formData, "website")) {
    return { success: true };
  }

  const name = field(formData, "name");
  const email = field(formData, "email");
  if (!name) return { error: "Please enter your name." };
  if (!email) return { error: "Please enter your email address." };

  // Same IP-capture expression the signing flow uses.
  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers().get("x-real-ip") ||
    "unknown";

  // Layer 2: Turnstile. No-op until TURNSTILE_SECRET_KEY is configured.
  const passed = await verifyTurnstile(field(formData, "cf-turnstile-response"), ip);
  if (!passed) {
    return { error: "We could not verify that you are human. Please try again." };
  }

  const company = field(formData, "company");
  const phone = field(formData, "phone");
  const projectType = field(formData, "project_type");
  const budgetRange = field(formData, "budget_range");
  const message = field(formData, "message");

  // Prefer the service-role client. Once the `anon` grant on submit_inquiry is
  // revoked (migration 008), this server action is the ONLY way to reach the
  // function — which is what makes the honeypot, Turnstile, and the real client
  // IP impossible to skip. Falls back to the anon client when the key is not
  // configured, so the form keeps working during rollout.
  const supabase = createAdminClient() ?? createClient();
  const { error } = await supabase.rpc("submit_inquiry", {
    p_name: name,
    p_email: email,
    p_company: company,
    p_phone: phone,
    p_project_type: projectType,
    p_budget_range: budgetRange,
    p_message: message,
    p_ip: ip,
  });

  if (error) {
    // Validation and rate-limit messages are raised as plain exceptions in the
    // function and are safe to show. Anything else is infrastructure noise.
    const known =
      error.message.includes("Please enter") || error.message.includes("Too many submissions");
    return {
      error: known
        ? error.message
        : "Something went wrong sending that. Please email us directly instead.",
    };
  }

  // The row above is the source of truth. The alert is best-effort and never
  // fails the submission — see sendInquiryAlert.
  await sendInquiryAlert({
    name,
    email,
    company,
    phone,
    projectType,
    budgetRange,
    message,
  });

  return { success: true };
}
