import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteInvoiceRecord, markInvoicePaid } from "../actions";
// import { createStripeCheckout } from "../stripeActions";
import { fmtMoney } from "../../quotes/lineItems";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-baseline gap-x-2.5 gap-y-1 mb-0.5">
      <span className="text-[10.5px] font-semibold text-brand-dark whitespace-nowrap">{label}</span>
      <span className="text-[11px] text-brand-dark border-b border-dashed border-brand-light pb-0.5">{value || "—"}</span>
    </div>
  );
}

function SummaryRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-4 border-t border-brand-light first:border-t-0">
      <span
        className={
          emphasize
            ? "text-xs font-semibold uppercase tracking-wide text-brand-dark"
            : "text-xs uppercase tracking-wide text-gray-500"
        }
      >
        {label}
      </span>
      <span className={emphasize ? "text-base font-semibold text-brand-dark" : "text-sm text-brand-dark"}>{value}</span>
    </div>
  );
}

export default async function InvoiceDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { from?: string; payment?: string } }) {
  const backHref = searchParams.from ?? "/dashboard/invoices";
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to Invoices";
  const paymentStatus = searchParams.payment;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, clients(id, name, company, email, phone), quotes(id, title)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!invoice) notFound();


  async function handleDelete() {
    "use server";
    await deleteInvoiceRecord(invoice!.id);
  }

  async function handleMarkPaid() {
    "use server";
    await markInvoicePaid(invoice!.id);
  }


  return (
    <div className="p-8">
      {paymentStatus === "success" && (
        <div className="mb-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-5 py-3.5 text-sm font-medium">
          <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Payment received! This invoice will be marked paid shortly via webhook.
        </div>
      )}
      {paymentStatus === "cancelled" && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-3.5 text-sm font-medium">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Payment was cancelled — no charge was made.
        </div>
      )}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href={backHref}
            className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
          >
            {backLabel}
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-brand-dark">{invoice.invoice_number}</h1>
            {invoice.status === "paid" && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-lg">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Paid
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{invoice.title}</p>
          {invoice.clients?.name && (
            <Link
              href={`/dashboard/clients/${invoice.clients.id}`}
              className="text-sm text-brand-mid hover:text-brand-dark transition-colors mt-1 inline-block"
            >
              {invoice.clients.name}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {invoice.status !== "paid" && (
            <form action={handleMarkPaid}>
              <button
                type="submit"
                className="bg-brand-light text-brand-dark text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-mid hover:text-white transition-colors"
              >
                Mark Paid
              </button>
            </form>
          )}
          <Link
            href={`/dashboard/invoices/${invoice.id}/edit`}
            className="bg-brand-mid text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            Edit
          </Link>
          <form action={handleDelete}>
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors px-2 py-2"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Document */}
      <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden max-w-4xl">
        {/* Doc header */}
        <div className="px-9 pt-7 pb-5 flex items-start justify-between gap-5 border-b-[2.5px] border-brand-dark">
          <div className="flex items-center">
            <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-24 w-auto" priority />
          </div>
          <div className="text-right">
            <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">Invoice</p>
            <div className="flex flex-col gap-0.5 text-[11.5px] text-gray-500">
              <p>
                <span className="font-medium">Invoice #:</span>{" "}
                <span className="text-brand-dark font-mono">{invoice.invoice_number}</span>
              </p>
              <p>
                <span className="font-medium">Issued:</span>{" "}
                <span className="text-brand-dark">{fmtDate(invoice.issued_date)}</span>
              </p>
              <p>
                <span className="font-medium">Due:</span>{" "}
                <span className="text-brand-dark">{fmtDate(invoice.due_date)}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="px-9 pt-6 pb-8">
          {/* Bill to / Invoice info */}
          <div className="grid grid-cols-2 gap-3.5 mb-7">
            <div className="bg-brand-cream border border-brand-light rounded-lg px-4 py-3.5">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark mb-2.5">Bill To</p>
              <InfoField label="Company" value={invoice.clients?.company} />
              <InfoField label="Contact" value={invoice.clients?.name} />
              <InfoField label="Email" value={invoice.clients?.email} />
              <InfoField label="Phone" value={invoice.clients?.phone} />
            </div>
            <div className="bg-brand-cream border border-brand-light rounded-lg px-4 py-3.5">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark mb-2.5">Invoice Details</p>
              <InfoField label="Title" value={invoice.title} />
              <InfoField label="Status" value={invoice.status === "paid" ? "Paid" : "Unpaid"} />
              <InfoField label="Paid Date" value={fmtDate(invoice.paid_date)} />
              <InfoField
                label="Linked Quote"
                value={
                  invoice.quotes?.title ? (
                    <Link
                      href={`/dashboard/quotes/${invoice.quotes.id}`}
                      className="text-brand-mid hover:text-brand-dark transition-colors"
                    >
                      {invoice.quotes.title}
                    </Link>
                  ) : null
                }
              />
            </div>
          </div>

          {invoice.description && (
            <div className="mb-7">
              <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-brand-dark whitespace-pre-wrap">{invoice.description}</p>
            </div>
          )}

          {/* Summary */}
          <div className="border border-brand-light rounded-lg overflow-hidden max-w-md ml-auto">
            <div className="bg-brand-light/40">
              <SummaryRow label="Total Due" value={fmtMoney(invoice.amount)} emphasize />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-7">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-2">Payment Terms &amp; Notes</p>
            <ul className="space-y-1.5">
              {[
                "Payment is due by the date specified above. Late payments may be subject to a 1.5% monthly fee.",
                "Please reference the invoice number on all payments and correspondence.",
                "All prices are in USD.",
              ].map((note) => (
                <li key={note} className="text-xs text-gray-500 flex gap-2">
                  <span className="text-brand-mid font-bold flex-shrink-0">•</span>
                  {note}
                </li>
              ))}
            </ul>
            {invoice.notes && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-1">Internal Notes</p>
                <p className="text-sm text-brand-dark whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ACH Payment Instructions */}
        {invoice.status !== "paid" && (
          <div className="mx-8 mb-6 bg-brand-cream border border-brand-light rounded-xl px-6 py-4">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-1.5">How to Pay</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              To pay this invoice, please contact{" "}
              <span className="font-semibold text-brand-dark">Rooted Tech Solutions</span>{" "}
              and we will provide you with our account details for ACH payment.
            </p>
            <div className="mt-2.5 flex items-center gap-4 text-xs text-brand-mid font-medium">
              <a href="mailto:hello@rootedtechsolutions.com" className="hover:text-brand-dark transition-colors">
                hello@rootedtechsolutions.com
              </a>
            </div>
          </div>
        )}

        <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
          Rooted Tech Solutions · rootedtechsolutions.com
        </div>
      </div>
    </div>
  );
}
