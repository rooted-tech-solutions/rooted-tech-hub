// Stripe integration — deferred. Uncomment when ready to activate.
//
// "use server";
//
// import { redirect } from "next/navigation";
// import { headers } from "next/headers";
// import { createClient } from "@/lib/supabase/server";
// import { stripe } from "@/lib/stripe";
//
// export async function createStripeCheckout(invoiceId: string) {
//   const supabase = createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) redirect("/login");
//
//   const { data: invoice } = await supabase
//     .from("invoices")
//     .select("*, clients(name, company, email)")
//     .eq("id", invoiceId)
//     .eq("user_id", user.id)
//     .single();
//
//   if (!invoice || !invoice.amount) throw new Error("Invoice not found or has no amount");
//
//   const headersList = headers();
//   const host = headersList.get("host") ?? "localhost:3003";
//   const proto = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
//   const baseUrl = `${proto}://${host}`;
//
//   const clientName =
//     (invoice.clients as { company?: string | null; name?: string | null } | null)?.company ||
//     (invoice.clients as { company?: string | null; name?: string | null } | null)?.name || "Client";
//   const clientEmail = (invoice.clients as { email?: string | null } | null)?.email ?? undefined;
//
//   const typeLabels: Record<string, string> = {
//     deposit: "Deposit", final_payment: "Final Payment",
//     annual_renewal: "Annual Renewal", custom: "Payment",
//   };
//   const typeLabel = typeLabels[invoice.invoice_type ?? "custom"] ?? "Payment";
//
//   const session = await stripe.checkout.sessions.create({
//     mode: "payment",
//     customer_email: clientEmail,
//     line_items: [{ price_data: { currency: "usd", unit_amount: Math.round(invoice.amount * 100),
//       product_data: { name: `${invoice.title} — ${typeLabel}`, description: `Invoice ${invoice.invoice_number} · ${clientName}` } }, quantity: 1 }],
//     metadata: { invoice_id: invoice.id, user_id: user.id },
//     success_url: `${baseUrl}/dashboard/invoices/${invoice.id}?payment=success`,
//     cancel_url: `${baseUrl}/dashboard/invoices/${invoice.id}?payment=cancelled`,
//   });
//
//   if (!session.url) throw new Error("Could not create Stripe session");
//   redirect(session.url);
// }
