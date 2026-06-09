import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney } from "./quotes/lineItems";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-brand-light p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${accent ?? "text-brand-dark"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [clientsRes, quotesRes, invoicesRes, contractsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company, renewal_date")
      .eq("user_id", user.id),
    supabase.from("quotes").select("id, status, amount").eq("user_id", user.id),
    supabase.from("invoices").select("id, status, amount, due_date, title, clients(name, company)").eq("user_id", user.id) as unknown as Promise<{
      data: { id: string; status: string; amount: number | null; due_date: string | null; title: string; clients: { name: string | null; company: string | null } | null }[] | null;
    }>,
    supabase.from("contracts").select("id, status, clients(id, name, company)").eq("user_id", user.id) as unknown as Promise<{
      data: { id: string; status: string; clients: { id: string; name: string | null; company: string | null } | null }[] | null;
    }>,
  ]);

  const clients = clientsRes.data ?? [];
  const quotes = quotesRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const contracts = contractsRes.data ?? [];

  // Stats
  const totalClients = clients.length;
  const openQuotes = quotes.filter((q) => q.status === "sent").length;
  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const outstandingInvoices = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((sum, i) => sum + (i.amount ?? 0), 0);

  // Action items
  const renewingSoon = clients
    .filter((c) => {
      if (!c.renewal_date) return false;
      const days = daysUntil(c.renewal_date);
      return days >= 0 && days <= 60;
    })
    .map((c) => ({ ...c, days: daysUntil(c.renewal_date!) }))
    .sort((a, b) => a.days - b.days);

  const overdueRenewals = clients.filter((c) => {
    if (!c.renewal_date) return false;
    return daysUntil(c.renewal_date) < 0;
  });

  const unsignedContracts = contracts.filter((c) => c.status === "sent");

  const overdueInvoices = invoices.filter((i) => {
    if (i.status !== "sent" && i.status !== "overdue") return false;
    if (!i.due_date) return false;
    return daysUntil(i.due_date) < 0;
  });

  const hasActions = renewingSoon.length > 0 || overdueRenewals.length > 0 || unsignedContracts.length > 0 || overdueInvoices.length > 0;

  return (
    <div className="p-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand-mid to-brand-mid/80 text-white px-8 py-7 mb-7 shadow-lg shadow-brand-mid/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-brand-brown/20 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-light/70 mb-1.5">Overview</p>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-brand-light/80 mt-1.5">Welcome back — here&apos;s where things stand today.</p>
        </div>
        <div className="relative grid grid-cols-4 gap-3 mt-6">
          {[
            { label: "Clients", value: totalClients },
            { label: "Open Quotes", value: openQuotes },
            { label: "Unsigned Contracts", value: unsignedContracts.length },
            { label: "Action Items", value: renewingSoon.length + overdueRenewals.length + overdueInvoices.length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 px-4 py-3">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-[11px] uppercase tracking-wide text-brand-light/70 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        <StatCard label="Total Revenue (Paid)" value={fmtMoney(totalRevenue)} sub="all time" accent="text-brand-mid" />
        <StatCard
          label="Outstanding"
          value={fmtMoney(outstandingInvoices)}
          sub="sent & overdue invoices"
          accent={outstandingInvoices > 0 ? "text-amber-600" : "text-brand-mid"}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Action required */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-brand-dark uppercase tracking-wide">Action Required</h2>

          {!hasActions && (
            <div className="bg-white rounded-2xl border border-brand-light p-6 text-center shadow-sm">
              <p className="text-sm text-gray-400">All clear — no action items right now.</p>
            </div>
          )}

          {overdueRenewals.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Renewal Overdue</p>
              </div>
              <div className="divide-y divide-brand-light">
                {overdueRenewals.map((c) => (
                  <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-red-50/50 transition-colors">
                    <span className="text-sm font-medium text-brand-dark">{c.company || c.name}</span>
                    <span className="text-xs text-red-600 font-medium">
                      {Math.abs(daysUntil(c.renewal_date!))} days overdue — reach out now
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {renewingSoon.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Renewals Coming Up</p>
              </div>
              <div className="divide-y divide-brand-light">
                {renewingSoon.map((c) => (
                  <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-amber-50/50 transition-colors">
                    <span className="text-sm font-medium text-brand-dark">{c.company || c.name}</span>
                    <span className={`text-xs font-medium ${c.days <= 14 ? "text-amber-600" : "text-gray-500"}`}>
                      {c.days === 0 ? "Renews today" : `Renews in ${c.days} day${c.days === 1 ? "" : "s"}`}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {unsignedContracts.length > 0 && (
            <div className="bg-white rounded-2xl border border-brand-light shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-brand-cream border-b border-brand-light flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-mid" />
                <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide">Awaiting Signature</p>
              </div>
              <div className="divide-y divide-brand-light">
                {unsignedContracts.map((c) => (
                  <Link key={c.id} href={`/dashboard/contracts/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-brand-cream/60 transition-colors">
                    <span className="text-sm font-medium text-brand-dark">{c.clients?.company || c.clients?.name || "Unknown client"}</span>
                    <span className="text-xs text-brand-mid font-medium">Contract sent — awaiting signature →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {overdueInvoices.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Overdue Invoices</p>
              </div>
              <div className="divide-y divide-brand-light">
                {overdueInvoices.map((inv) => (
                  <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-red-50/50 transition-colors">
                    <span className="text-sm font-medium text-brand-dark">{inv.title}</span>
                    <span className="text-xs text-red-600 font-medium">{fmtMoney(inv.amount)} — {Math.abs(daysUntil(inv.due_date!))} days past due</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-brand-dark uppercase tracking-wide mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: "Add a Client", href: "/dashboard/clients/new", desc: "Save contact info" },
              { label: "Create a Quote", href: "/dashboard/quotes/new", desc: "Draft a price estimate" },
              { label: "New Invoice", href: "/dashboard/invoices/new", desc: "Bill a client" },
              { label: "View Contracts", href: "/dashboard/contracts", desc: "Track signed agreements" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block bg-white rounded-xl border border-brand-light p-4 hover:border-brand-mid hover:shadow-sm transition-all"
              >
                <p className="text-sm font-semibold text-brand-dark group-hover:text-brand-mid transition-colors">
                  {item.label} →
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
