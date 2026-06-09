import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "../quotes/statusBadge";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtMoney(amount: number | null) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount ?? 0);
}

export default async function InvoicesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  type InvoiceRow = {
    id: string;
    invoice_number: string;
    title: string;
    amount: number;
    status: string;
    due_date: string | null;
    clients: { name: string | null } | null;
  };

  const { data: invoices } = (await supabase
    .from("invoices")
    .select("id, invoice_number, title, amount, status, due_date, clients(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as unknown as { data: InvoiceRow[] | null };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">
            {invoices?.length ?? 0} invoice{invoices?.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="bg-brand-mid text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-light p-10 text-center">
          <p className="text-sm text-gray-500">No invoices yet.</p>
          <Link
            href="/dashboard/invoices/new"
            className="inline-block mt-3 text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors"
          >
            Create your first invoice →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-light overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-light text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">Invoice #</th>
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="border-b border-brand-light last:border-0 hover:bg-brand-cream/60 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="font-medium text-brand-dark hover:text-brand-mid transition-colors"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{invoice.title}</td>
                  <td className="px-5 py-3 text-gray-600">{invoice.clients?.name || "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{fmtMoney(invoice.amount)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">{fmtDate(invoice.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
