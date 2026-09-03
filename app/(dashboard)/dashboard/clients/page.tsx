import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { renewalLabel } from "../quotes/lineItems";
import { computeLifecycle } from "./lifecycle";
import { computeNextStep, daysUntil } from "./nextStep";

const RENEWAL_TONE_CLASSES: Record<string, string> = {
  overdue: "bg-red-50 text-red-700 ring-1 ring-red-200",
  soon: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  normal: "bg-brand-light/50 text-brand-dark ring-1 ring-brand-light",
  none: "bg-gray-50 text-gray-400 ring-1 ring-gray-200",
};

function RenewalBadge({ date }: { date: string | null }) {
  const { text, tone } = renewalLabel(date);
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${RENEWAL_TONE_CLASSES[tone]}`}>
      {text}
    </span>
  );
}

function initials(label: string) {
  return label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

type ClientRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  renewal_date: string | null;
  notes: string | null;
  lifecycle_stage: string | null;
};
type ContractRow = { id: string; client_id: string | null; status: string; quote_id: string | null; sent_at: string | null; signed_at: string | null; sign_token: string };

export default async function ClientsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Separate queries so a missing table can never blank the client list.
  const [clientsRes, quotesRes, invoicesRes, contractsRes, sowsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company, email, phone, renewal_date, notes, lifecycle_stage")
      .eq("user_id", user.id)
      .order("name", { ascending: true }) as unknown as Promise<{ data: ClientRow[] | null }>,
    supabase.from("quotes").select("id, client_id, status").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("id, client_id, invoice_type, status, due_date").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, client_id, status, quote_id, sent_at, signed_at, sign_token")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ContractRow[] | null }>,
    supabase.from("scope_of_work").select("id, client_id, status").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  const clients = clientsRes.data ?? [];
  const forClient = <T extends { client_id: string | null }>(rows: T[] | null, id: string) => (rows ?? []).filter((r) => r.client_id === id);

  const rows = clients.map((client) => {
    const quotes = forClient(quotesRes.data, client.id);
    const invoices = forClient(invoicesRes.data, client.id);
    const contracts = forClient(contractsRes.data, client.id);
    const sows = forClient(sowsRes.data, client.id);
    const lifecycle = computeLifecycle({
      hasQuote: quotes.some((q) => q.status === "sent" || q.status === "accepted"),
      latestQuoteStatus: quotes[0]?.status ?? null,
      contract: contracts[0] ?? null,
      invoices,
      renewalDate: client.renewal_date,
      manualStage: client.lifecycle_stage,
    });
    const next = computeNextStep(
      { clientId: client.id, notes: client.notes, renewalDate: client.renewal_date, stage: lifecycle.stage, sows, quotes, contracts, invoices },
      "/dashboard/clients",
    );
    return { client, lifecycle, next };
  });

  const total = clients.length;
  const upcomingRenewals = clients.filter((c) => {
    const days = daysUntil(c.renewal_date);
    return days !== null && days >= 0 && days <= 30;
  }).length;
  const yourMove = rows.filter((r) => r.next.owner === "you").length;

  return (
    <div className="p-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-gray-400">Relationships</p>
          <h1 className="text-3xl font-bold tracking-tight text-brand-dark">Clients</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {total} client{total === 1 ? "" : "s"} · {yourMove} waiting on you · {upcomingRenewals} renewal{upcomingRenewals === 1 ? "" : "s"} in 30 days
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="rounded-xl bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-mid"
        >
          + Add client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-brand-light bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-gray-500">No clients yet.</p>
          <Link href="/dashboard/clients/new" className="mt-3 inline-block text-sm font-medium text-brand-mid transition-colors hover:text-brand-dark">
            Add your first client →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-light bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-light text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Next step</th>
                <th className="px-5 py-3 font-medium">Renewal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ client, lifecycle, next }) => {
                const label = client.company || client.name;
                return (
                  <tr key={client.id} className="border-b border-brand-light transition-colors last:border-0 hover:bg-brand-cream/60">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/clients/${client.id}`} className="group flex items-center gap-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-dark text-xs font-semibold text-white">
                          {initials(label)}
                        </span>
                        <div>
                          <span className="block font-medium text-brand-dark transition-colors group-hover:text-brand-mid">{label}</span>
                          {client.email && <span className="text-xs text-gray-400">{client.email}</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${lifecycle.color}`}>{lifecycle.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={next.href} className="group block">
                        <span className={`block text-sm ${next.owner === "you" ? "font-medium text-brand-dark" : "text-gray-500"} transition-colors group-hover:text-brand-mid`}>
                          {next.title}
                        </span>
                        {next.owner === "client" && <span className="text-[11px] text-gray-400">waiting on client</span>}
                      </Link>
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
