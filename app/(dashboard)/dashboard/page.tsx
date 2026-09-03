import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney } from "./quotes/lineItems";
import { computeLifecycle } from "./clients/lifecycle";
import { computeNextStep, daysUntil, type NextStep } from "./clients/nextStep";
import { daysPastDue, effectiveInvoiceStatus } from "./invoices/status";

/*
 * The dashboard answers one question: what should I do today?
 *
 * "Up next" runs the same next-step engine as each client page across every
 * client and groups the results by whose move it is. "Needs attention" is the
 * calendar talking — overdue invoices and renewals — regardless of pipeline
 * position. Quick actions start from a client or the inbox, never from a
 * blank document.
 */

type ClientRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  renewal_date: string | null;
  notes: string | null;
  lifecycle_stage: string | null;
};
type QuoteRow = { id: string; client_id: string | null; status: string; amount: number | null; kind?: string | null };
type InvoiceRow = {
  id: string;
  client_id: string | null;
  status: string;
  amount: number | null;
  due_date: string | null;
  title: string;
  invoice_type: string | null;
  clients: { name: string | null; company: string | null } | null;
};
type ContractRow = {
  id: string;
  client_id: string | null;
  status: string;
  quote_id: string | null;
  sent_at: string | null;
  signed_at: string | null;
  sign_token: string;
  clients: { id: string; name: string | null; company: string | null } | null;
};
type SowRow = { id: string; client_id: string | null; status: string };
type EventRow = {
  id: string;
  client_id: string | null;
  kind: string;
  summary: string;
  actor: "you" | "client" | "system";
  created_at: string;
  clients: { name: string | null; company: string | null } | null;
};

function StatCard({
  label,
  value,
  sub,
  accent,
  href,
  linkLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-brand-light bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold ${accent ?? "text-brand-dark"}`}>{value}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        {href && (
          <Link href={href} className="text-xs font-medium text-brand-mid transition-colors hover:text-brand-dark">
            {linkLabel ?? "View all →"}
          </Link>
        )}
      </div>
    </div>
  );
}

function UpNextRow({ client, next }: { client: ClientRow; next: NextStep }) {
  const label = client.company || client.name;
  const actionLabel = next.action?.kind === "link" ? next.action.label : "Open";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <Link href={`/dashboard/clients/${client.id}`} className="text-sm font-semibold text-brand-dark transition-colors hover:text-brand-mid">
          {label}
        </Link>
        <p className="text-sm text-brand-dark/80">{next.title}</p>
        <p className="text-xs text-gray-400">{next.detail}</p>
      </div>
      <Link
        href={next.href}
        className="flex-shrink-0 rounded-lg bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-mid hover:text-white"
      >
        {actionLabel} →
      </Link>
    </li>
  );
}

function AttentionList({
  tone,
  title,
  children,
}: {
  tone: "red" | "amber" | "green";
  title: string;
  children: React.ReactNode;
}) {
  const border = tone === "red" ? "border-red-200" : tone === "amber" ? "border-amber-200" : "border-brand-light";
  const head =
    tone === "red" ? "bg-red-50 border-red-200 text-red-700" : tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-brand-cream border-brand-light text-brand-dark";
  const dot = tone === "red" ? "bg-red-500" : tone === "amber" ? "bg-amber-500" : "bg-brand-mid";
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${border}`}>
      <div className={`flex items-center gap-2 border-b px-5 py-3 ${head}`}>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <div className="divide-y divide-brand-light">{children}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [clientsRes, quotesRes, invoicesRes, contractsRes, sowsRes, inboxRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company, email, renewal_date, notes, lifecycle_stage")
      .eq("user_id", user.id)
      .order("name", { ascending: true }) as unknown as Promise<{ data: ClientRow[] | null }>,
    supabase.from("quotes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }) as unknown as Promise<{ data: QuoteRow[] | null }>,
    supabase
      .from("invoices")
      .select("id, client_id, status, amount, due_date, title, invoice_type, clients(name, company)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: InvoiceRow[] | null }>,
    supabase
      .from("contracts")
      .select("id, client_id, status, quote_id, sent_at, signed_at, sign_token, clients(id, name, company)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ContractRow[] | null }>,
    supabase.from("scope_of_work").select("id, client_id, status").eq("user_id", user.id).order("created_at", { ascending: false }) as unknown as Promise<{ data: SowRow[] | null }>,
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  // Timeline (migration 010). Missing table → empty list, nothing else changes.
  const { data: recentRaw } = await supabase
    .from("events")
    .select("id, client_id, kind, summary, actor, created_at, clients(name, company)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);
  const recent = (recentRaw ?? []) as unknown as EventRow[];

  const clients = clientsRes.data ?? [];
  const quotes = quotesRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const contracts = contractsRes.data ?? [];
  const sows = sowsRes.data ?? [];
  const newLeads = inboxRes.count ?? 0;

  // ── Up next: one line per client ──────────────────────────────────────────
  const forClient = <T extends { client_id: string | null }>(rows: T[], id: string) => rows.filter((r) => r.client_id === id);
  const todo = clients.map((client) => {
    const cq = forClient(quotes, client.id).filter((q) => (q.kind ?? "proposal") !== "change_order");
    const ci = forClient(invoices, client.id);
    const cc = forClient(contracts, client.id);
    const cs = forClient(sows, client.id);
    const lifecycle = computeLifecycle({
      hasQuote: cq.some((q) => q.status === "sent" || q.status === "accepted"),
      latestQuoteStatus: cq[0]?.status ?? null,
      contract: cc[0] ?? null,
      invoices: ci.map((i) => ({ invoice_type: i.invoice_type, status: i.status })),
      renewalDate: client.renewal_date,
      manualStage: client.lifecycle_stage,
    });
    const next = computeNextStep(
      { clientId: client.id, notes: client.notes, renewalDate: client.renewal_date, stage: lifecycle.stage, sows: cs, quotes: cq, contracts: cc, invoices: ci },
      "/dashboard",
    );
    return { client, lifecycle, next };
  });
  // Closest to money first.
  const bySection = (a: { next: NextStep }, b: { next: NextStep }) => b.next.section - a.next.section;
  const yourMove = todo.filter((t) => t.next.owner === "you").sort(bySection);
  const waiting = todo.filter((t) => t.next.owner === "client").sort(bySection);
  const quiet = todo.filter((t) => t.next.owner === "none");

  // ── Money ─────────────────────────────────────────────────────────────────
  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const outstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((sum, i) => sum + (i.amount ?? 0), 0);

  // ── Needs attention: the calendar talking ────────────────────────────────
  const overdueInvoices = invoices.filter((i) => effectiveInvoiceStatus(i) === "overdue");
  const unsignedContracts = contracts.filter((c) => c.status === "sent");
  const renewingSoon = clients
    .map((c) => ({ ...c, days: daysUntil(c.renewal_date) }))
    .filter((c) => c.days !== null && c.days >= 0 && c.days <= 60)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
  const overdueRenewals = clients.filter((c) => {
    const d = daysUntil(c.renewal_date);
    return d !== null && d < 0;
  });
  const attentionCount = overdueInvoices.length + unsignedContracts.length + renewingSoon.length + overdueRenewals.length;
  const hasAttention = attentionCount > 0;

  return (
    <div className="p-4 md:p-8">
      {/* Hero */}
      <div className="relative mb-7 overflow-hidden rounded-2xl bg-brand-dark px-8 py-7 text-white shadow-lg shadow-brand-dark/10">
        <div className="relative">
          <p className="mb-1.5 text-xs uppercase tracking-[0.2em] text-brand-light/70">Today</p>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1.5 text-sm text-brand-light/80">
            {yourMove.length === 0
              ? "Nothing waiting on you. Nice."
              : `${yourMove.length} thing${yourMove.length === 1 ? "" : "s"} waiting on you · ${waiting.length} waiting on clients`}
          </p>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Clients", value: clients.length },
            { label: "Your move", value: yourMove.length },
            { label: "Waiting on clients", value: waiting.length },
            { label: "Needs attention", value: attentionCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-brand-light/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Money */}
      <div className="mb-7 grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Revenue (Paid)" value={fmtMoney(totalRevenue)} sub="all time" accent="text-brand-mid" href="/dashboard/invoices" linkLabel="All invoices →" />
        <StatCard
          label="Outstanding"
          value={fmtMoney(outstanding)}
          sub="sent & overdue invoices"
          accent={outstanding > 0 ? "text-amber-600" : "text-brand-mid"}
          href="/dashboard/invoices"
          linkLabel="All invoices →"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Up next */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-dark">Your move</h2>
            {yourMove.length === 0 ? (
              <div className="rounded-2xl border border-brand-light bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-gray-400">
                  {clients.length === 0 ? "Add a client or convert a lead from the inbox to get started." : "Every client is waiting on someone else, or all set."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-light overflow-hidden rounded-2xl border border-brand-light bg-white shadow-sm">
                {yourMove.map(({ client, next }) => (
                  <UpNextRow key={client.id} client={client} next={next} />
                ))}
              </ul>
            )}
          </div>

          {waiting.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-dark">Waiting on clients</h2>
              <ul className="divide-y divide-brand-light overflow-hidden rounded-2xl border border-brand-light bg-white shadow-sm">
                {waiting.map(({ client, next }) => (
                  <UpNextRow key={client.id} client={client} next={next} />
                ))}
              </ul>
            </div>
          )}

          {quiet.length > 0 && (
            <p className="text-xs text-gray-400">
              {quiet.length} active client{quiet.length === 1 ? "" : "s"} with nothing due:{" "}
              {quiet.map(({ client }, i) => (
                <span key={client.id}>
                  {i > 0 && ", "}
                  <Link href={`/dashboard/clients/${client.id}`} className="text-brand-mid hover:text-brand-dark">
                    {client.company || client.name}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
        </div>

        {/* Needs attention + quick actions */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-dark">Needs attention</h2>
            {!hasAttention && (
              <div className="rounded-2xl border border-brand-light bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-gray-400">All clear.</p>
              </div>
            )}
            <div className="space-y-4">
              {overdueRenewals.length > 0 && (
                <AttentionList tone="red" title="Renewal overdue">
                  {overdueRenewals.map((c) => (
                    <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-red-50/50">
                      <span className="text-sm font-medium text-brand-dark">{c.company || c.name}</span>
                      <span className="text-xs font-medium text-red-600">{Math.abs(daysUntil(c.renewal_date) ?? 0)} days</span>
                    </Link>
                  ))}
                </AttentionList>
              )}
              {overdueInvoices.length > 0 && (
                <AttentionList tone="red" title="Overdue invoices">
                  {overdueInvoices.map((inv) => (
                    <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-red-50/50">
                      <span className="min-w-0 truncate text-sm font-medium text-brand-dark">
                        {inv.clients?.company || inv.clients?.name || inv.title}
                      </span>
                      <span className="flex-shrink-0 text-xs font-medium text-red-600">
                        {fmtMoney(inv.amount)} · {daysPastDue(inv)}d
                      </span>
                    </Link>
                  ))}
                </AttentionList>
              )}
              {renewingSoon.length > 0 && (
                <AttentionList tone="amber" title="Renewals coming up">
                  {renewingSoon.map((c) => (
                    <Link key={c.id} href={`/dashboard/clients/${c.id}`} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-amber-50/50">
                      <span className="text-sm font-medium text-brand-dark">{c.company || c.name}</span>
                      <span className={`text-xs font-medium ${(c.days ?? 99) <= 14 ? "text-amber-600" : "text-gray-500"}`}>
                        {c.days === 0 ? "today" : `${c.days}d`}
                      </span>
                    </Link>
                  ))}
                </AttentionList>
              )}
              {unsignedContracts.length > 0 && (
                <AttentionList tone="green" title="Awaiting signature">
                  {unsignedContracts.map((c) => (
                    <Link key={c.id} href={`/dashboard/contracts/${c.id}`} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-brand-cream/60">
                      <span className="text-sm font-medium text-brand-dark">{c.clients?.company || c.clients?.name || "Client"}</span>
                      <span className="text-xs font-medium text-brand-mid">
                        sent {c.sent_at ? new Date(c.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                      </span>
                    </Link>
                  ))}
                </AttentionList>
              )}
            </div>
          </div>

          {recent.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-dark">Recent activity</h2>
              <ol className="divide-y divide-brand-light overflow-hidden rounded-2xl border border-brand-light bg-white shadow-sm">
                {recent.map((ev) => (
                  <li key={ev.id} className="px-4 py-2.5">
                    <p className="text-xs text-brand-dark">
                      {ev.client_id && (
                        <Link href={`/dashboard/clients/${ev.client_id}`} className="font-semibold hover:text-brand-mid">
                          {ev.clients?.company || ev.clients?.name || "Client"}
                        </Link>
                      )}
                      {ev.client_id && " · "}
                      {ev.summary}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {new Date(ev.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      {ev.actor === "client" && " · client"}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-dark">Quick actions</h2>
            <div className="space-y-3">
              <Link href="/dashboard/inbox" className="group block rounded-xl border border-brand-light bg-white p-4 transition-all hover:border-brand-mid hover:shadow-sm">
                <p className="flex items-center justify-between text-sm font-semibold text-brand-dark transition-colors group-hover:text-brand-mid">
                  Inbox →
                  {newLeads > 0 && (
                    <span className="rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-bold text-brand-dark">{newLeads} new</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">Leads from the website</p>
              </Link>
              <Link href="/dashboard/clients/new" className="group block rounded-xl border border-brand-light bg-white p-4 transition-all hover:border-brand-mid hover:shadow-sm">
                <p className="text-sm font-semibold text-brand-dark transition-colors group-hover:text-brand-mid">Add a client →</p>
                <p className="mt-0.5 text-xs text-gray-400">Everything else starts from their page</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
