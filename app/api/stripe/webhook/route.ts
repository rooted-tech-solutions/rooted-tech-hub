// Stripe webhook — deferred. Uncomment when Stripe is activated.
//
// import { NextRequest, NextResponse } from "next/server";
// import { stripe } from "@/lib/stripe";
// import { createClient } from "@/lib/supabase/server";
// import Stripe from "stripe";
//
// export async function POST(req: NextRequest) {
//   const body = await req.text();
//   const sig = req.headers.get("stripe-signature");
//   if (!sig || !process.env.STRIPE_WEBHOOK_SECRET)
//     return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
//   let event: Stripe.Event;
//   try {
//     event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//   } catch (err) {
//     console.error("Stripe webhook signature verification failed:", err);
//     return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
//   }
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object as Stripe.Checkout.Session;
//     const invoiceId = session.metadata?.invoice_id;
//     const userId = session.metadata?.user_id;
//     if (invoiceId && userId) {
//       const supabase = createClient();
//       const { data: invoice } = await supabase.from("invoices").select("invoice_type, client_id").eq("id", invoiceId).single();
//       const today = new Date().toISOString().split("T")[0];
//       await supabase.from("invoices").update({ status: "paid", paid_date: today }).eq("id", invoiceId);
//       if (invoice?.invoice_type === "final_payment" && invoice.client_id) {
//         const renewalDate = new Date();
//         renewalDate.setFullYear(renewalDate.getFullYear() + 1);
//         await supabase.from("clients").update({ renewal_date: renewalDate.toISOString().split("T")[0] }).eq("id", invoice.client_id);
//       }
//       console.log(`Invoice ${invoiceId} marked as paid via Stripe webhook`);
//     }
//   }
//   return NextResponse.json({ received: true });
// }
