import { SITE } from "@/lib/site";
import { sendMail } from "@/lib/mailer";

/**
 * The emails the Hub sends. Content lives here; how it gets delivered lives
 * in lib/mailer.ts. Every function is best-effort: the database row the
 * caller already wrote is the source of truth, and a mail failure must never
 * fail the action that triggered it.
 */

export type InquiryAlert = {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  projectType?: string | null;
  budgetRange?: string | null;
  message?: string | null;
};

/** Announce a new website inquiry to the owner. */
export async function sendInquiryAlert(inquiry: InquiryAlert): Promise<{ sent: boolean }> {
  const line = (label: string, value?: string | null) => (value ? `${label}: ${value}\n` : "");
  const text =
    `New inquiry from the website.\n\n` +
    line("Name", inquiry.name) +
    line("Email", inquiry.email) +
    line("Company", inquiry.company) +
    line("Phone", inquiry.phone) +
    line("Project type", inquiry.projectType) +
    line("Budget", inquiry.budgetRange) +
    (inquiry.message ? `\nMessage:\n${inquiry.message}\n` : "") +
    `\nOpen it in the Hub: ${SITE.domain}/dashboard/inbox\n`;

  const result = await sendMail({
    to: SITE.inquiryNotifyTo,
    // Hitting reply answers the lead directly.
    replyTo: inquiry.email,
    subject: `New inquiry — ${inquiry.name}${inquiry.company ? ` (${inquiry.company})` : ""}`,
    text,
  });
  if (!result.sent) console.error("Inquiry alert email not sent:", result.reason);
  return { sent: result.sent };
}

/** Tell the owner the moment a client signs. */
export async function sendSignedAlert(input: { clientLabel: string; signedName: string; contractUrl: string }): Promise<{ sent: boolean }> {
  const result = await sendMail({
    to: SITE.inquiryNotifyTo,
    subject: `Signed — ${input.clientLabel}`,
    text:
      `${input.signedName} just signed the service agreement for ${input.clientLabel}.\n\n` +
      `Next step: the deposit invoice.\n${input.contractUrl}\n`,
  });
  if (!result.sent) console.error("Signed alert email not sent:", result.reason);
  return { sent: result.sent };
}

/**
 * The client's invoice, from us. Returns why it could not be sent so the
 * caller can fall back to Stripe's own email and tell the owner what happened.
 */
export async function sendInvoiceEmail(input: { to: string; subject: string; html: string; text: string }): Promise<{ sent: boolean; via?: string; reason?: string }> {
  const result = await sendMail({ to: input.to, replyTo: SITE.email, subject: input.subject, html: input.html, text: input.text });
  return { sent: result.sent, via: result.via ?? undefined, reason: result.reason };
}
