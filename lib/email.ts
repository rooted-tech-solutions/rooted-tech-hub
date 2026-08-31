import { Resend } from "resend";
import { SITE } from "@/lib/site";

/**
 * Outbound email.
 *
 * Only configured when RESEND_API_KEY is present, so the app runs locally
 * without it. Resend's free tier will only deliver to the account owner's own
 * address until a domain is DNS-verified — since the inquiry alert goes to the
 * owner, that works from day one, before the domain exists.
 */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export type InquiryAlert = {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  projectType?: string | null;
  budgetRange?: string | null;
  message?: string | null;
};

/**
 * Announce a new website inquiry.
 *
 * Best-effort by design. The database row written by submit_inquiry is the
 * source of truth; if this fails the lead is still sitting in the Hub inbox.
 * Never throw — a mail outage must not cost a lead.
 */
export async function sendInquiryAlert(inquiry: InquiryAlert): Promise<{ sent: boolean }> {
  if (!resend) return { sent: false };

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

  try {
    await resend.emails.send({
      from: SITE.mailFrom,
      to: SITE.inquiryNotifyTo,
      // Hitting reply answers the lead directly rather than the sender address.
      replyTo: inquiry.email,
      subject: `New inquiry — ${inquiry.name}${inquiry.company ? ` (${inquiry.company})` : ""}`,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error("Inquiry alert email failed:", err);
    return { sent: false };
  }
}
