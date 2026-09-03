import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateWithOptional } from "@/lib/supabase/updateWithOptional";
import { logEvent } from "@/lib/events";
import { todayISO } from "@/lib/dates";
import { applyInvoicePaid } from "@/app/(dashboard)/dashboard/invoices/paid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HubInvoice = { id: string; user_id: string; client_id: string | null; title: string; status: string };

/**
 * Stripe → Hub.
 *
 * Verifies the signature, finds the Hub invoice the Stripe invoice was created
 * from (metadata.hub_invoice_id, falling back to the stored stripe_invoice_id)
 * and reconciles it. Runs with the service role: there is no user session on
 * a webhook, and RLS would otherwise hide every row.
 *
 * Idempotent on purpose — Stripe retries anything that is not a 2xx and may
 * deliver `invoice.paid` more than once; applyInvoicePaid is a no-op on an
 * invoice that is already paid. Unknown events and unknown invoices return
 * 200 so Stripe stops resending them.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  if (!event.type.startsWith("invoice.")) return NextResponse.json({ received: true, ignored: event.type });

  const admin = createAdminClient();
  if (!admin) {
    console.error("[stripe webhook] SUPABASE_SERVICE_ROLE_KEY is not set; cannot reconcile", event.id);
    return NextResponse.json({ error: "Server is not configured to reconcile" }, { status: 503 });
  }

  const stripeInvoice = event.data.object as Stripe.Invoice;
  const hub = await findHubInvoice(admin, stripeInvoice);
  if (!hub) return NextResponse.json({ received: true, ignored: "no matching Hub invoice" });

  switch (event.type) {
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const paidDate = todayISO(new Date(event.created * 1000));
      await applyInvoicePaid(admin, hub.user_id, hub.id, { paidDate, via: "stripe" });
      break;
    }
    case "invoice.payment_failed": {
      await updateWithOptional(admin, "invoices", { id: hub.id }, {}, { stripe_status: "payment_failed" });
      await logEvent(admin, {
        userId: hub.user_id,
        clientId: hub.client_id,
        kind: "invoice_failed",
        summary: `${hub.title} — payment attempt failed`,
        actor: "system",
        refType: "invoice",
        refId: hub.id,
      });
      break;
    }
    case "invoice.voided":
    case "invoice.marked_uncollectible": {
      const stripeStatus = event.type === "invoice.voided" ? "void" : "uncollectible";
      if (hub.status !== "paid") {
        await updateWithOptional(admin, "invoices", { id: hub.id }, { status: "cancelled" }, { stripe_status: stripeStatus });
      }
      await logEvent(admin, {
        userId: hub.user_id,
        clientId: hub.client_id,
        kind: "invoice_voided",
        summary: `${hub.title} — marked ${stripeStatus} in Stripe`,
        actor: "system",
        refType: "invoice",
        refId: hub.id,
      });
      break;
    }
    default:
      return NextResponse.json({ received: true, ignored: event.type });
  }

  return NextResponse.json({ received: true });
}

async function findHubInvoice(admin: SupabaseClient, inv: Stripe.Invoice): Promise<HubInvoice | null> {
  const cols = "id, user_id, client_id, title, status";
  const hubId = inv.metadata?.hub_invoice_id;
  if (hubId) {
    const { data } = await admin.from("invoices").select(cols).eq("id", hubId).maybeSingle();
    if (data) return data as HubInvoice;
  }
  const { data } = await admin.from("invoices").select(cols).eq("stripe_invoice_id", inv.id).maybeSingle();
  return (data as HubInvoice | null) ?? null;
}
