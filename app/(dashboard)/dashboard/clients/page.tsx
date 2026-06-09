import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { renewalLabel } from "../quotes/lineItems";
import { computeLifecycle } from "./lifecycle";

const RENEWAL_TONE_CLASSES: Record<string, string> = {
  overdue: "bg-red-50 text-red-700 ring-1 ring-red-200",
  soon: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  normal: "bg-brand-light/50 text-brand-dark ring-1 ring-brand-light",
  none: "bg-gray-50 text-gray-400 ring-1 ring-gray-200",
};

function RenewalBadge({ date }: { date: string | null }) {
  const { text, tone } = renewalLabel(date);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${RENEWAL_TONE_CLASSES[tone]}`}>
      {text}
    </span>
  );
}


export default async function ClientsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch clients and their related lifecycle data in separate queries so a missing
  // table (e.g. contracts not yet migrated) doesn't silently wipe the client list.
  const [{ data: rawClients }, { data: allQuotes }, { data: allInvoices }, contractsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company, email, phone, renewal_date")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("quotes")
      .select("id, client_id, status")
      .eq("user_id", user.id),
    supabase
      .from("invoices")
      .select("id, client_id, invoice_type, status")
      .eq("user_id", user.id),
    supabase
      .from("contracts")
      .select("id, client_id, status")
      .eq("user_id", user.id),
  ]);

  type ClientRow = {
    id: string; name: string; company: string | null; email: string | null; phone: string | null; renewal_date: string | null;
    quotes: { id: string; status: string }[];
    invoices: { invoice_type: string | null; status: string }[];
    contracts: { status: string }[];
  };

  const clients: ClientRow[] | null = (rawClients ?? []).map((c) => ({
    ...c,
    quotes: (allQuotes ?? []).filter((q) => q.client_id === c.id),
    invoices: (allInvoices ?? []).filter((i) => (i as { client_id?: string }).client_id === c.id),
    contracts: (contractsRes.data ?? []).filter((ct) => (ct as { client_id?: string }).client_id === c.id),
  }));

  const total = clients?.length ?? 0;
  const today = new Date();
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  const upcomingRenewals =
    clients?.filter((c) => {
      if (!c.renewal_date) return false;
      const d = new Date(c.renewal_date + "T00:00:00");
      return d >= today && d <= in30;
    }).length ?? 0;
  const missingContact = clients?.filter((c) => !c.email && !c.phone).length ?? 0;

  function initials(label: string) {
    return label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
  }

  return (
    <div className="p-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand-mid to-brand-mid/80 text-white px-8 py-7 mb-7 shadow-lg shadow-brand-mid/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-brand-brown/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-light/70 mb-1.5">Relationships</p>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-sm text-brand-light/80 mt-1.5">
              {total} client{total === 1 ? "" : "s"} · {upcomingRenewals} renewal{upcomingRenewals === 1 ? "" : "s"} due in 30 days
            </p>
          </div>
          <Link
            href="/dashboard/clients/new"
            className="bg-white text-brand-dark text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-cream transition-colors shadow-md shadow-black/10 flex-shrink-0"
          >
            + Add Client
          </Link>
        </div>

        {/* Stat tiles */}
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Total Clients", value: total },
            { label: "Renewals (30 days)", value: upcomingRenewals },
            { label: "Missing Contact Info", value: missingContact },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-4 py-3">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-brand-light/70 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {!clients || clients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-light p-10 text-center shadow-sm">
          <p className="text-sm text-gray-500">No clients yet.</p>
          <Link
            href="/dashboard/clients/new"
            className="inline-block mt-3 text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors"
          >
            Add your first client →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-light overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-light text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Renewal</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const label = client.company || client.name;
                const lc = computeLifecycle({
                  hasQuote: client.quotes.some((q) => q.status === "sent" || q.status === "accepted"),
                  contract: client.contracts[0] ?? null,
                  invoices: client.invoices,
                  renewalDate: client.renewal_date,
                });
                return (
                  <tr
                    key={client.id}
                    className="border-b border-brand-light last:border-0 hover:bg-brand-cream/60 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 group">
                        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-mid to-brand-dark text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 shadow-sm">
                          {initials(label)}
                        </span>
                        <div>
                          <span className="font-medium text-brand-dark group-hover:text-brand-mid transition-colors block">{label}</span>
                          {client.email && <span className="text-xs text-gray-400">{client.email}</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{client.phone || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${lc.color}`}>
                        {lc.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <RenewalBadge date={client.renewal_date} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
