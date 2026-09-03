"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { logEvent } from "@/lib/events";
import { updateWithOptional } from "@/lib/supabase/updateWithOptional";
import { addDaysISO, todayISO } from "@/lib/dates";
import { fmtMoney } from "../quotes/lineItems";
import { sendInvoiceEmail } from "@/lib/email";
import { invoiceEmailHtml, invoiceEmailSubject, invoiceEmailText, type InvoiceEmailInput } from "@/lib/emails/invoiceEmail";
import { publicOrigin } from "../contracts/links";

type ClientJoin = {
  id: string;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
} | null;

/**
 * Send a Hub invoice through Stripe Invoicing.
 *
 * Stripe is the payment rail, not the messenger. The Hub builds the Stripe
 * invoice (customer if needed, invoice, one line item, finalize) and then
 * emails the client *our* invoice — the Hub's layout — with a Pay button that
 * opens Stripe's secure payment page. Only if that email cannot be delivered
 * (no Resend key; domain not yet verified) does Stripe send its own email, and
 * the owner is told which happened. The webhook marks the Hub invoice paid
 * when the money lands. Later calls only re-send, never re-bill.
 *
 * Ends in a redirect to `from` (or the invoice page) carrying
 * ?stripe=sent|resent or ?stripe_error=<why>, because a plain <form action>
 * has no other way to report back.
 */
export async function sendInvoiceViaStripe(invoiceId: string, from?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const back = from ?? `/dashboard/invoices/${invoiceId}`;
  const bounce = (params: Record<string, string>): never => {
    const url = new URL(back, "http://hub.local");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    redirect(url.pathname + url.search);
  };

  const stripe = getStripe();
  if (!stripe) bounce({ stripe_error: "Stripe is not configured on this server (STRIPE_SECRET_KEY)." });

  const { data: invoice, error: loadError } = await supabase
    .from("invoices")
    .select("*, clients(id, name, company, email, phone, stripe_customer_id)")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();
  if (loadError && /stripe_customer_id|schema cache/i.test(loadError.message)) {
    bounce({ stripe_error: "Run migration 010 first — the Stripe columns are not in the database yet." });
  }
  if (!invoice) bounce({ stripe_error: "Invoice not found." });

  const client = invoice.clients as ClientJoin;
  const amountCents = Math.round(Number(invoice.amount ?? 0) * 100);
  if (amountCents <= 0) bounce({ stripe_error: "The invoice has no amount." });
  if (!client?.email) bounce({ stripe_error: "Add an email address to the client first — Stripe sends the invoice there." });
  if (invoice.status === "paid") bounce({ stripe_error: "This invoice is already paid." });

  let error: string | null = null;
  let outcome: "sent" | "resent" = "sent";
  type Delivery = { via: "email" | "stripe"; transport: string | null; note: string | null };
  let delivery: Delivery = { via: "stripe", transport: null, note: null };

  /** Our branded email with the Pay button; falls back to Stripe's email and says why. */
  const deliver = async (stripeInvoiceId: string, payUrl: string | null): Promise<Delivery> => {
    let note: string | null = null;
    if (payUrl) {
      const input: InvoiceEmailInput = {
        origin: publicOrigin(),
        payUrl,
        invoice: {
          invoice_number: invoice.invoice_number,
          title: invoice.title,
          description: invoice.description ?? null,
          amount: invoice.amount,
          issued_date: invoice.issued_date ?? todayISO(),
          due_date: invoice.due_date,
          invoice_type: invoice.invoice_type,
        },
        client: { name: client!.name, company: client!.company, email: client!.email, phone: client!.phone },
      };
      const mail = await sendInvoiceEmail({
        to: client!.email!,
        subject: invoiceEmailSubject(input),
        html: invoiceEmailHtml(input),
        text: invoiceEmailText(input),
      });
      if (mail.sent) return { via: "email", transport: mail.via ?? null, note: null };
      note = mail.reason ?? "email could not be sent";
    }
    await stripe!.invoices.sendInvoice(stripeInvoiceId);
    return { via: "stripe", transport: null, note };
  };

  try {
    if (invoice.stripe_invoice_id) {
      delivery = await deliver(invoice.stripe_invoice_id, invoice.stripe_hosted_url ?? null);
      await updateWithOptional(supabase, "invoices", { id: invoice.id, user_id: user.id }, {}, { stripe_sent_at: new Date().toISOString() });
      outcome = "resent";
    } else {
      let customerId = client!.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe!.customers.create({
          name: client!.company || client!.name || undefined,
          email: client!.email!,
          metadata: { hub_client_id: client!.id, hub_user_id: user.id },
        });
        customerId = customer.id;
        await supabase.from("clients").update({ stripe_customer_id: customerId }).eq("id", client!.id).eq("user_id", user.id);
      }

      // Stripe needs a due date in the future. Use the Hub's; if that has
      // already passed, give the client a week and write the new date back.
      const today = todayISO();
      let dueISO: string = invoice.due_date ?? addDaysISO(today, 30);
      if (dueISO <= today) dueISO = addDaysISO(today, 7);
      const dueUnix = Math.floor(new Date(dueISO + "T23:59:00").getTime() / 1000);

      // Stripe renders its own document. Make sure it says what ours says:
      // the Hub invoice number and what the payment is for, printed on the
      // hosted page and the PDF.
      const paymentLabel: Record<string, string> = {
        deposit: "Deposit — 50% of the agreement, due on signing",
        final_payment: "Final payment — balance due on delivery and acceptance",
        annual_renewal: "Annual care plan renewal",
      };
      const kind = paymentLabel[invoice.invoice_type ?? ""] ?? null;

      const created = await stripe!.invoices.create({
        customer: customerId,
        collection_method: "send_invoice",
        due_date: dueUnix,
        description: invoice.description ?? undefined,
        footer: `Thank you for working with Rooted Tech Solutions. · ${invoice.invoice_number}`,
        custom_fields: [
          { name: "Invoice", value: String(invoice.invoice_number ?? "").slice(0, 140) },
          ...(kind ? [{ name: "For", value: kind.slice(0, 140) }] : []),
        ],
        metadata: {
          hub_invoice_id: invoice.id,
          hub_client_id: client!.id,
          hub_user_id: user.id,
          hub_invoice_number: invoice.invoice_number ?? "",
        },
        auto_advance: false,
        pending_invoice_items_behavior: "exclude",
      });
      await stripe!.invoiceItems.create({
        customer: customerId,
        invoice: created.id,
        amount: amountCents,
        currency: "usd",
        description: kind ? `${invoice.title} — ${kind.split(" — ")[0]}` : invoice.title,
      });
      const finalized = await stripe!.invoices.finalizeInvoice(created.id);
      const hosted = finalized.hosted_invoice_url ?? null;
      // Record the Stripe side before trying to email, so a mail failure can
      // never leave a live Stripe invoice the Hub does not know about.
      const base: Record<string, unknown> = { status: "sent" };
      if (!invoice.issued_date) base.issued_date = today;
      if (invoice.due_date !== dueISO) base.due_date = dueISO;
      await updateWithOptional(
        supabase,
        "invoices",
        { id: invoice.id, user_id: user.id },
        base,
        { stripe_invoice_id: created.id, stripe_hosted_url: hosted, stripe_status: finalized.status ?? "open", stripe_sent_at: new Date().toISOString() },
      );
      invoice.due_date = dueISO;
      delivery = await deliver(created.id, hosted);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Stripe rejected the request.";
  }

  if (error) bounce({ stripe_error: error });

  await logEvent(supabase, {
    userId: user.id,
    clientId: client!.id,
    kind: "invoice_sent",
    summary:
      `${invoice.title} ${outcome === "resent" ? "re-sent" : "sent"} — ${fmtMoney(invoice.amount)} — ` +
      (delivery.via === "email"
        ? `your invoice by email${delivery.transport ? ` (${delivery.transport})` : ""}, Pay button to Stripe`
        : `Stripe's email${delivery.note ? ` (yours could not be sent: ${delivery.note})` : ""}`),
    refType: "invoice",
    refId: invoice.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoice.id}`);
  revalidatePath(`/dashboard/clients/${client!.id}`);
  revalidatePath("/dashboard/clients");
  bounce({
    stripe: outcome,
    via: delivery.via,
    ...(delivery.transport ? { transport: delivery.transport } : {}),
    ...(delivery.note ? { note: delivery.note.slice(0, 200) } : {}),
  });
}
