import nodemailer from "nodemailer";
import { Resend } from "resend";
import { SITE } from "@/lib/site";

export type MailInput = { to: string; subject: string; text: string; html?: string; replyTo?: string };
export type MailResult = { sent: boolean; via: "gmail" | "resend" | null; reason?: string };

/**
 * Outbound email, whichever way is available.
 *
 * 1. Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD): sends from the business
 *    Gmail address to anyone. The free route until a domain exists — Google
 *    allows roughly 500 messages a day, which is plenty.
 * 2. Resend (RESEND_API_KEY): until a domain is verified it only delivers to
 *    the account owner's own address, so it can carry the owner alerts but
 *    not a client's invoice. Once a domain is verified, drop the Gmail vars
 *    and it takes over.
 *
 * Never throws. Callers decide what a failure means (the invoice sender
 * falls back to Stripe's own email; the alerts just log).
 */
export async function sendMail(input: MailInput): Promise<MailResult> {
  const reasons: string[] = [];

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""); // Google shows app passwords with spaces
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `${SITE.name} <${gmailUser}>`,
        to: input.to,
        replyTo: input.replyTo ?? gmailUser,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      return { sent: true, via: "gmail" };
    } catch (err) {
      reasons.push(`Gmail: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { error } = await new Resend(resendKey).emails.send({
        from: SITE.mailFrom,
        to: input.to,
        replyTo: input.replyTo ?? SITE.email,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      if (!error) return { sent: true, via: "resend" };
      reasons.push(`Resend: ${error.message}`);
    } catch (err) {
      reasons.push(`Resend: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (reasons.length === 0) reasons.push("no email transport configured (GMAIL_USER + GMAIL_APP_PASSWORD, or RESEND_API_KEY)");
  return { sent: false, via: null, reason: reasons.join(" · ") };
}
