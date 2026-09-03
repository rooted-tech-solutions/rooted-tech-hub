import type { SupabaseClient } from "@supabase/supabase-js";
import { updateWithOptional } from "@/lib/supabase/updateWithOptional";
import { logEvent } from "@/lib/events";
import { addYearsISO } from "@/lib/dates";
import { fmtMoney } from "../quotes/lineItems";

/**
 * Everything that happens when an invoice is paid, whoever says so.
 *
 * The owner's "Mark paid" button calls this with their session client; the
 * Stripe webhook calls it with the service-role client and the invoice's own
 * user_id. Both paths must agree on the care-plan arithmetic, so it lives here:
 * a final payment starts the plan one year from the payment date, and a
 * renewal payment extends it one year from the existing renewal date.
 */
export async function applyInvoicePaid(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string,
  opts: { paidDate: string; via: "stripe" | "manual" },
): Promise<{ clientId: string | null; alreadyPaid: boolean }> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, invoice_type, client_id, status, title, amount")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();
  if (!invoice) return { clientId: null, alreadyPaid: false };

  const clientId = (invoice.client_id as string | null) ?? null;
  if (invoice.status === "paid") return { clientId, alreadyPaid: true };

  await updateWithOptional(
    supabase,
    "invoices",
    { id: invoiceId, user_id: userId },
    { status: "paid", paid_date: opts.paidDate },
    { paid_via: opts.via, ...(opts.via === "stripe" ? { stripe_status: "paid" } : {}) },
  );

  const type = invoice.invoice_type as string | null;
  if (clientId && (type === "final_payment" || type === "annual_renewal")) {
    let baseISO = opts.paidDate;
    if (type === "annual_renewal") {
      const { data: client } = await supabase
        .from("clients")
        .select("renewal_date")
        .eq("id", clientId)
        .eq("user_id", userId)
        .single();
      if (client?.renewal_date) baseISO = client.renewal_date;
    }
    await supabase
      .from("clients")
      .update({ renewal_date: addYearsISO(baseISO, 1) })
      .eq("id", clientId)
      .eq("user_id", userId);
  }

  await logEvent(supabase, {
    userId,
    clientId,
    kind: "invoice_paid",
    summary: `${invoice.title} paid — ${fmtMoney(invoice.amount)}${opts.via === "stripe" ? " (Stripe)" : ""}`,
    actor: opts.via === "stripe" ? "client" : "you",
    refType: "invoice",
    refId: invoiceId,
  });

  return { clientId, alreadyPaid: false };
}
