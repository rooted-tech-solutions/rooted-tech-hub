import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "./statusBadge";
import { fmtMoney } from "./lineItems";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function QuotesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  type QuoteRow = {
    id: string;
    title: string;
    build_total: number | null;
    monthly_retainer: number | null;
    status: string;
    issued_date: string | null;
    expiry_date: string | null;
    clients: { name: string | null; company: string | null } | null;
  };

  const { data: quotes } = (await supabase
    .from("quotes")
    .select("id, title, build_total, monthly_retainer, status, issued_date, expiry_date, clients(name, company)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as unknown as { data: QuoteRow[] | null };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-brand-dark">Quotes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {quotes?.length ?? 0} quote{quotes?.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="bg-brand-mid text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
        >
          + New Quote
        </Link>
      </div>

      {!quotes || quotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-light p-10 text-center">
          <p className="text-sm text-gray-500">No quotes yet.</p>
          <Link
            href="/dashboard/quotes/new"
            className="inline-block mt-3 text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors"
          >
            Create your first quote →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-light overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-light text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Build Cost</th>
                <th className="px-5 py-3 font-medium">Monthly Retainer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Issued</th>
                <th className="px-5 py-3 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="border-b border-brand-light last:border-0 hover:bg-brand-cream/60 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/quotes/${quote.id}`}
                      className="font-medium text-brand-dark hover:text-brand-mid transition-colors"
                    >
                      {quote.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{quote.clients?.company || quote.clients?.name || "—"}</td>
                  <td className="px-5 py-3 text-gray-600">{fmtMoney(quote.build_total)}</td>
                  <td className="px-5 py-3 text-gray-600">{fmtMoney(quote.monthly_retainer)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={quote.status} />
                  </td>
                  <td className="px-5 py-3 text-gray-600">{fmtDate(quote.issued_date)}</td>
                  <td className="px-5 py-3 text-gray-600">{fmtDate(quote.expiry_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
