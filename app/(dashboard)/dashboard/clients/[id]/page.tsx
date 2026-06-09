import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteClientRecord, updateClientStageFromForm } from "../actions";
import { StatusBadge } from "../../quotes/statusBadge";
import { annualValue, fmtMoney, renewalLabel } from "../../quotes/lineItems";
import { computeLifecycle, LIFECYCLE_STEPS, STAGE_ORDER } from "../lifecycle";
import { deleteQuoteRecord } from "../../quotes/actions";
import { deleteInvoiceRecord, markInvoicePaid } from "../../invoices/actions";
import { deleteContractRecord, generateContractFromQuote } from "../../contracts/actions";
import { deleteSowRecord } from "../../scope/actions";

const RENEWAL_TONE_CLASSES: Record<string, string> = {
  overdue: "bg-red-400/20 text-red-100 ring-1 ring-red-300/30",
  soon: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30",
  normal: "bg-white/15 text-white ring-1 ring-white/20",
  none: "bg-white/10 text-brand-light/60 ring-1 ring-white/15",
};

function RenewalBadge({ date }: { date: string | null }) {
  const { text, tone } = renewalLabel(date);
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${RENEWAL_TONE_CLASSES[tone]}`}>
      {text}
    </span>
  );
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-mid mb-1">{label}</p>
      <p className="text-sm text-brand-dark">{value || "—"}</p>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl px-4 py-3 ring-1 backdrop-blur-sm ${
        accent ? "bg-white/15 ring-white/20" : "bg-white/10 ring-white/15"
      }`}
    >
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-brand-light/70 mt-0.5">{label}</p>
    </div>
  );
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!client) notFound();

  type ContractRow = {
    id: string;
    status: string;
    quote_id: string | null;
    sent_at: string | null;
    signed_at: string | null;
    signed_name: string | null;
    quotes: { id: string; title: string } | null;
  };

  const [{ data: quotes }, { data: invoices }, contractsResult, { data: sows }] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, title, status, build_total, monthly_retainer, issued_date")
      .eq("user_id", user.id)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, title, status, invoice_type, amount, issued_date, due_date")
      .eq("user_id", user.id)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, status, quote_id, sent_at, signed_at, signed_name, quotes(id, title)")
      .eq("user_id", user.id)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ContractRow[] | null }>,
    supabase
      .from("scope_of_work")
      .select("id, sow_number, title, status, issued_date")
      .eq("user_id", user.id)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
  ]);
  const contracts = contractsResult.data;

  // Set of quote IDs that already have a contract
  const contractedQuoteIds = new Set((contracts ?? []).map((c) => c.quote_id).filter(Boolean));

  const quoteCount = quotes?.length ?? 0;
  const invoiceCount = invoices?.length ?? 0;
  const lifetimeInvoiced = (invoices ?? []).reduce((sum, inv) => sum + (inv.amount ?? 0), 0);
  const monthlyRetainer = (quotes ?? []).reduce((sum, q) => sum + (q.monthly_retainer ?? 0), 0);
  const label = client.company || client.name;

  const latestContract = contracts?.[0] ?? null;
  const lifecycle = computeLifecycle({
    hasQuote: (quotes ?? []).some((q) => q.status === "sent" || q.status === "accepted"),
    contract: latestContract,
    invoices: (invoices ?? []).map((inv) => ({ invoice_type: (inv as { invoice_type?: string | null }).invoice_type ?? null, status: inv.status })),
    renewalDate: client.renewal_date,
    manualStage: (client as { lifecycle_stage?: string | null }).lifecycle_stage,
  });
  const currentStepOrder = STAGE_ORDER[lifecycle.stage];

  async function handleDelete() {
    "use server";
    await deleteClientRecord(client!.id);
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
        >
          ← Back to Clients
        </Link>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand-mid to-brand-mid/80 text-white px-8 py-7 mb-7 shadow-lg shadow-brand-mid/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-brand-brown/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm text-white text-lg font-bold flex items-center justify-center flex-shrink-0">
              {initials(label)}
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-light/70 mb-1">Client Profile</p>
              <h1 className="text-3xl font-bold tracking-tight">{label}</h1>
              {client.company && <p className="text-sm text-brand-light/80 mt-1">{client.name}</p>}
              <div className="mt-2.5 flex items-center gap-2">
                <RenewalBadge date={client.renewal_date} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href={`/dashboard/clients/${client.id}/edit`}
              className="bg-white text-brand-dark text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-cream transition-colors shadow-md shadow-black/10"
            >
              Edit
            </Link>
            <form action={handleDelete}>
              <button
                type="submit"
                className="text-sm font-medium text-brand-light/80 hover:text-white transition-colors px-2 py-2"
              >
                Delete
              </button>
            </form>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="relative grid grid-cols-5 gap-3 mt-6">
          <StatTile label="Quotes" value={String(quoteCount)} />
          <StatTile label="Invoices" value={String(invoiceCount)} />
          <StatTile label="Lifetime Invoiced" value={fmtMoney(lifetimeInvoiced)} accent />
          <StatTile label="Monthly Retainer" value={fmtMoney(monthlyRetainer)} accent />
          <StatTile label="Annual Renewal" value={fmtMoney(annualValue(monthlyRetainer))} accent />
        </div>
      </div>

      {/* Lifecycle stepper */}
      <div className="bg-white rounded-2xl border border-brand-light px-6 py-5 max-w-4xl shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide">Client Lifecycle</p>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${lifecycle.color}`}>
            {lifecycle.label}
          </span>
        </div>
        <div className="flex items-center gap-0">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const stepOrder = STAGE_ORDER[step.stage as keyof typeof STAGE_ORDER];
            const done = currentStepOrder > stepOrder;
            const current = currentStepOrder === stepOrder;
            const isLast = idx === LIFECYCLE_STEPS.length - 1;
            return (
              <div key={step.stage} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-shrink-0">
                  <form action={updateClientStageFromForm}>
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="stage" value={step.stage} />
                    <button
                      type="submit"
                      title={`Set stage: ${step.label}`}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer hover:scale-110 hover:ring-4 hover:ring-brand-dark/10 ${
                        done
                          ? "bg-brand-mid text-white"
                          : current
                          ? "bg-brand-dark text-white ring-4 ring-brand-dark/20"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                    >
                      {done ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </button>
                  </form>
                  <span className={`text-[10px] font-medium mt-1 whitespace-nowrap ${current ? "text-brand-dark" : done ? "text-brand-mid" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div className={`h-0.5 flex-1 mx-1 mb-4 rounded ${done ? "bg-brand-mid" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">{lifecycle.description}</p>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-brand-light p-6 max-w-3xl space-y-6 shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          <Field label="Contact Name" value={client.name} />
          <Field label="Company" value={client.company} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Email" value={client.email} />
          <Field label="Phone" value={client.phone} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Field label="Contract Signed" value={fmtDate(client.contract_signed_date)} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-mid mb-1">Renewal Date</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-brand-dark">{fmtDate(client.renewal_date)}</p>
              {client.renewal_date && (
                <span className="text-xs text-gray-400">· {renewalLabel(client.renewal_date).text.toLowerCase()}</span>
              )}
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-mid mb-1">Notes</p>
          <p className="text-sm text-brand-dark whitespace-pre-wrap">{client.notes || "—"}</p>
        </div>
      </div>

      {/* ── Client Package (Quote + SOW + Contract) ── */}
      <div className="max-w-4xl mt-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-brand-dark uppercase tracking-wide">Client Package</h2>
            <p className="text-xs text-gray-400 mt-0.5">Quote · Scope of Work · Contract — sent together</p>
          </div>
          <div className="flex items-center gap-2">
            {quotes && quotes.length > 0 && (
              <Link
                href={`/dashboard/quotes/${quotes[0].id}/preview`}
                className="inline-flex items-center gap-1.5 bg-brand-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-mid transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Preview Package
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">

          {/* Quote column */}
          <div className="bg-white rounded-2xl border border-brand-light overflow-hidden shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-light bg-brand-cream/60">
              <span className="text-xs font-bold text-brand-dark uppercase tracking-wide">Quote</span>
              <Link
                href={`/dashboard/quotes/new?client_id=${client.id}&from=/dashboard/clients/${client.id}`}
                className="text-[11px] font-semibold text-brand-mid hover:text-brand-dark transition-colors"
              >
                + New
              </Link>
            </div>
            {!quotes || quotes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs text-gray-400">No quote yet</p>
                <Link href={`/dashboard/quotes/new?client_id=${client.id}&from=/dashboard/clients/${client.id}`} className="text-xs font-medium text-brand-mid hover:text-brand-dark transition-colors mt-1.5 inline-block">
                  Create →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-brand-light flex-1">
                {quotes.map((quote) => {
                  const hasContract = contractedQuoteIds.has(quote.id);
                  async function handleDeleteQuote() {
                    "use server";
                    await deleteQuoteRecord(quote.id, `/dashboard/clients/${client.id}`);
                  }
                  async function handleGenerateContract() {
                    "use server";
                    await generateContractFromQuote(quote.id);
                  }
                  return (
                    <div key={quote.id} className="px-4 py-3">
                      <div className="mb-1.5">
                        <Link href={`/dashboard/quotes/${quote.id}?from=/dashboard/clients/${client.id}`} className="group block">
                          <p className="text-xs font-semibold text-brand-dark group-hover:text-brand-mid transition-colors leading-snug">{quote.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{fmtMoney(quote.build_total)} build · {fmtMoney(quote.monthly_retainer)}/mo</p>
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!hasContract && (
                          <form action={handleGenerateContract}>
                            <button type="submit" className="text-[11px] text-brand-mid hover:text-brand-dark font-medium transition-colors">
                              + Contract
                            </button>
                          </form>
                        )}
                        <form action={handleDeleteQuote} className="ml-auto">
                          <button type="submit" className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none" aria-label="Delete quote">×</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SOW column */}
          <div className="bg-white rounded-2xl border border-brand-light overflow-hidden shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-light bg-brand-cream/60">
              <span className="text-xs font-bold text-brand-dark uppercase tracking-wide">Scope of Work</span>
              <Link
                href={`/dashboard/scope/new?client_id=${client.id}&from=/dashboard/clients/${client.id}`}
                className="text-[11px] font-semibold text-brand-mid hover:text-brand-dark transition-colors"
              >
                + New
              </Link>
            </div>
            {!sows || sows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs text-gray-400">No SOW yet</p>
                <Link href={`/dashboard/scope/new?client_id=${client.id}&from=/dashboard/clients/${client.id}`} className="text-xs font-medium text-brand-mid hover:text-brand-dark transition-colors mt-1.5 inline-block">
                  Create →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-brand-light flex-1">
                {sows.map((sow) => {
                  async function handleDeleteSow() {
                    "use server";
                    await deleteSowRecord(sow.id, `/dashboard/clients/${client.id}`);
                  }
                  return (
                    <div key={sow.id} className="px-4 py-3">
                      <div className="mb-1.5">
                        <Link href={`/dashboard/scope/${sow.id}?from=/dashboard/clients/${client.id}`} className="group block">
                          <p className="text-[11px] font-mono text-gray-400">{sow.sow_number}</p>
                          <p className="text-xs font-semibold text-brand-dark group-hover:text-brand-mid transition-colors leading-snug">{sow.title || "Untitled SOW"}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {sow.issued_date ? new Date(sow.issued_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No date"}
                          </p>
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/dashboard/scope/${sow.id}/edit?from=/dashboard/clients/${client.id}`}
                          className="text-[11px] text-gray-400 hover:text-brand-dark transition-colors"
                        >
                          Edit
                        </Link>
                        <form action={handleDeleteSow} className="ml-auto">
                          <button type="submit" className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none" aria-label="Delete SOW">×</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contract column */}
          <div className="bg-white rounded-2xl border border-brand-light overflow-hidden shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-light bg-brand-cream/60">
              <span className="text-xs font-bold text-brand-dark uppercase tracking-wide">Contract</span>
              {quotes && quotes.length > 0 && (contracts?.length ?? 0) === 0 && (
                <span className="text-[11px] text-gray-400">Generate from quote</span>
              )}
            </div>
            {!contracts || contracts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs text-gray-400">No contract yet</p>
                <p className="text-[11px] text-gray-400 mt-1">Use &quot;+ Contract&quot; on a quote</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-light flex-1">
                {contracts.map((contract) => {
                  async function handleDeleteContract() {
                    "use server";
                    await deleteContractRecord(contract.id);
                  }
                  return (
                    <div key={contract.id} className="px-4 py-3">
                      <div className="mb-1.5">
                        <Link href={`/dashboard/contracts/${contract.id}?from=/dashboard/clients/${client.id}`} className="group block">
                          <p className="text-xs font-semibold text-brand-dark group-hover:text-brand-mid transition-colors leading-snug">
                            {contract.quotes?.title ?? "Service Agreement"}
                          </p>
                          {contract.signed_name && (
                            <p className="text-[11px] text-brand-mid mt-0.5">Signed by {contract.signed_name}</p>
                          )}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/dashboard/contracts/${contract.id}?from=/dashboard/clients/${client.id}`}
                          className="text-[11px] text-gray-400 hover:text-brand-dark transition-colors"
                        >
                          View / Copy Link
                        </Link>
                        <form action={handleDeleteContract} className="ml-auto">
                          <button type="submit" className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none" aria-label="Delete contract">×</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Invoices ── */}
      <div className="max-w-4xl mt-8 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-brand-dark uppercase tracking-wide">Invoices</h2>
          <Link
            href={`/dashboard/invoices/new?client_id=${client.id}&from=/dashboard/clients/${client.id}`}
            className="bg-brand-mid text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-dark transition-colors"
          >
            + New Invoice
          </Link>
        </div>
        {!invoices || invoices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-light p-8 text-center shadow-sm">
            <p className="text-sm text-gray-400">No invoices yet.</p>
            <Link href={`/dashboard/invoices/new?client_id=${client.id}&from=/dashboard/clients/${client.id}`} className="text-xs font-medium text-brand-mid hover:text-brand-dark transition-colors mt-2 inline-block">
              Create first invoice →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-brand-light divide-y divide-brand-light overflow-hidden shadow-sm">
            {invoices.map((invoice) => {
              async function handleMarkPaid() {
                "use server";
                await markInvoicePaid(invoice.id, client.id);
              }
              async function handleDeleteInvoice() {
                "use server";
                await deleteInvoiceRecord(invoice.id, `/dashboard/clients/${client.id}`);
              }
              const typeLabel: Record<string, string> = {
                deposit: "Deposit",
                final_payment: "Final",
                annual_renewal: "Renewal",
                custom: "Custom",
              };
              return (
                <div key={invoice.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/dashboard/invoices/${invoice.id}?from=/dashboard/clients/${client.id}`} className="min-w-0 flex-1 group">
                      <p className="text-sm font-medium text-brand-dark group-hover:text-brand-mid transition-colors truncate">
                        <span className="font-mono text-xs text-gray-400 mr-1.5">{invoice.invoice_number}</span>
                        {invoice.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtMoney(invoice.amount)}
                        {(invoice as { invoice_type?: string | null }).invoice_type && (invoice as { invoice_type?: string | null }).invoice_type !== "custom" && (
                          <span className="ml-1.5 text-brand-mid">· {typeLabel[(invoice as { invoice_type?: string | null }).invoice_type!]}</span>
                        )}
                      </p>
                    </Link>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {invoice.status !== "paid" && (
                      <form action={handleMarkPaid}>
                        <button type="submit" className="text-xs bg-brand-light text-brand-dark px-3 py-1 rounded-md hover:bg-brand-mid hover:text-white transition-colors font-medium">
                          Mark Paid ✓
                        </button>
                      </form>
                    )}
                    <Link
                      href={`/dashboard/invoices/${invoice.id}/edit?from=/dashboard/clients/${client.id}`}
                      className="text-xs text-gray-400 hover:text-brand-dark transition-colors px-1 py-1"
                    >
                      Edit
                    </Link>
                    <form action={handleDeleteInvoice} className="ml-auto">
                      <button type="submit" className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none px-1" aria-label="Delete invoice">
                        ×
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
