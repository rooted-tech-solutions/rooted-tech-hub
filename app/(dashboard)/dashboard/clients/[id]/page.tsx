import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmButton from "@/components/ui/ConfirmButton";
import CopyButton from "@/components/ui/CopyButton";
import {
  addCareHoursFromForm,
  clearClientStageFromForm,
  deleteCareHoursFromForm,
  deleteClientRecord,
  updateClientNotesFromForm,
  updateClientStageFromForm,
} from "../actions";
import type { ContractSnapshot } from "../../contracts/contractTerms";
import { todayISO } from "@/lib/dates";
import { StatusBadge } from "../../quotes/statusBadge";
import { annualValue, fmtMoney, renewalLabel } from "../../quotes/lineItems";
import { computeLifecycle, LIFECYCLE_STEPS, STAGE_ORDER } from "../lifecycle";
import { computeNextStep, daysUntil } from "../nextStep";
import { deleteQuoteRecord, updateQuoteStatus } from "../../quotes/actions";
import { deleteInvoiceRecord, markInvoicePaid, markInvoiceSent } from "../../invoices/actions";
import { sendInvoiceViaStripe } from "../../invoices/stripeActions";
import { stripeMode } from "@/lib/stripe";
import { effectiveInvoiceStatus } from "../../invoices/status";
import { deleteContractRecord, generateContractFromQuote, sendPackage } from "../../contracts/actions";
import { signLinkFor } from "../../contracts/links";
import { deleteSowRecord, updateSowStatus } from "../../scope/actions";

/*
 * The client page is the spine of the Hub. Everything about one relationship
 * is here, in the order the work actually happens:
 *
 *   1 Meeting notes → 2 Scope of work → 3 Quote → 4 Contract → 5 Package → 6 Invoices
 *
 * "Next step" at the top is computed from the documents (clients/nextStep.ts)
 * and points at exactly one of those sections, which is also highlighted.
 * The seven-stage lifecycle stays as the at-a-glance summary, with an
 * explicit control for setting a stage by hand.
 */

type QuoteRow = {
  id: string;
  title: string;
  status: string;
  client_id: string | null;
  build_total: number | null;
  monthly_retainer: number | null;
  issued_date: string | null;
  project_name: string | null;
  // Present once migrations 009/010 have run; the query uses select("*") so
  // their absence is harmless.
  sent_at?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  kind?: string | null;
  contract_id?: string | null;
};
type SowRow = {
  id: string;
  sow_number: string;
  title: string | null;
  status: string;
  issued_date: string | null;
  quote_id: string | null;
  sent_at?: string | null;
  approved_at?: string | null;
};
type ContractRow = {
  id: string;
  status: string;
  quote_id: string | null;
  sent_at: string | null;
  signed_at: string | null;
  signed_name: string | null;
  sign_token: string;
  quotes: { id: string; title: string } | null;
  // Migration 010
  first_opened_at?: string | null;
  last_opened_at?: string | null;
};
type CareRow = { id: string; month: string; hours: number; note: string | null; created_at: string };
type EventRow = {
  id: string;
  kind: string;
  summary: string;
  actor: "you" | "client" | "system";
  created_at: string;
};
type InvoiceRow = {
  id: string;
  invoice_number: string;
  title: string;
  status: string;
  invoice_type: string | null;
  amount: number | null;
  issued_date: string | null;
  due_date: string | null;
  // Present once migration 010 has run (the query uses select("*")).
  stripe_invoice_id?: string | null;
  stripe_hosted_url?: string | null;
  stripe_status?: string | null;
};

const INVOICE_TYPE_LABEL: Record<string, string> = {
  deposit: "Deposit",
  final_payment: "Final",
  annual_renewal: "Renewal",
  custom: "Custom",
};

function fmtDay(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value.length === 10 ? value + "T00:00:00" : value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(label: string) {
  return label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

/** Sub-line under a document title: "Sent Mar 2 · Approved Mar 9". */
function Stamps({ items }: { items: [string, string | null | undefined][] }) {
  const shown = items.filter(([, v]) => v).map(([label, v]) => `${label} ${fmtDay(v)}`);
  if (shown.length === 0) return null;
  return <p className="mt-0.5 text-[11px] text-gray-400">{shown.join(" · ")}</p>;
}

const rowAction = "text-[12px] font-medium text-gray-500 hover:text-brand-dark transition-colors";
const rowPrimary =
  "text-[12px] font-semibold text-brand-dark bg-brand-light hover:bg-brand-mid hover:text-white rounded-md px-2.5 py-1 transition-colors";
const rowDelete = { className: "text-[12px] font-medium text-gray-400 hover:text-red-600 transition-colors", armedClassName: "text-[12px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md px-2.5 py-1 transition-colors" };
const headerButton =
  "inline-flex items-center rounded-lg bg-brand-mid px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark";
const headerLink =
  "inline-flex items-center rounded-lg border border-brand-light bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-cream";

function Step({
  n,
  title,
  summary,
  current,
  actions,
  children,
}: {
  n: number;
  title: string;
  summary?: React.ReactNode;
  current: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={`step-${n}`} className="relative scroll-mt-6 pl-12">
      <span
        className={`absolute left-0 top-3 flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-medium shadow-sm ring-1 ${
          current ? "bg-brand-dark text-white ring-brand-dark" : "bg-white text-brand-mid ring-brand-light"
        }`}
      >
        {String(n).padStart(2, "0")}
      </span>
      <div className={`rounded-2xl border bg-white shadow-sm ${current ? "border-brand-mid/40 ring-2 ring-brand-mid/15" : "border-brand-light"}`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-light px-5 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-brand-dark">{title}</h2>
            {summary}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <div className="px-5 py-4">{children}</div>
      </div>
    </section>
  );
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { stripe?: string; stripe_error?: string; via?: string; note?: string; transport?: string };
}) {
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

  const [{ data: quotesRaw }, { data: invoicesRaw }, contractsRes, { data: sowsRaw }] = await Promise.all([
    supabase.from("quotes").select("*").eq("user_id", user.id).eq("client_id", client.id).order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("*, quotes(id, title)")
      .eq("user_id", user.id)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }) as unknown as Promise<{ data: ContractRow[] | null }>,
    supabase.from("scope_of_work").select("*").eq("user_id", user.id).eq("client_id", client.id).order("created_at", { ascending: false }),
  ]);
  // The timeline (migration 010). A missing table just means an empty list.
  const { data: eventsRaw } = await supabase
    .from("events")
    .select("id, kind, summary, actor, created_at")
    .eq("user_id", user.id)
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .limit(40);
  const events = (eventsRaw ?? []) as EventRow[];
  // Care plan hours (migration 010) — only meaningful once an agreement exists.
  const { data: careRaw } = await supabase
    .from("care_hours")
    .select("id, month, hours, note, created_at")
    .eq("user_id", user.id)
    .eq("client_id", client.id)
    .order("month", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);
  const careEntries = (careRaw ?? []) as CareRow[];

  const quotes = (quotesRaw ?? []) as QuoteRow[];
  // Proposals drive the pipeline. Change orders hang off a signed agreement.
  const proposals = quotes.filter((q) => (q.kind ?? "proposal") !== "change_order");
  const changeOrders = quotes.filter((q) => q.kind === "change_order");
  const invoices = (invoicesRaw ?? []) as InvoiceRow[];
  const contracts = contractsRes.data ?? [];
  const sows = (sowsRaw ?? []) as SowRow[];

  const here = `/dashboard/clients/${client.id}`;
  const back = encodeURIComponent(here);
  const label: string = client.company || client.name;
  const manualStage = (client as { lifecycle_stage?: string | null }).lifecycle_stage ?? null;
  const hasDocuments = quotes.length + invoices.length + contracts.length + sows.length > 0;

  const lifecycle = computeLifecycle({
    hasQuote: proposals.some((q) => q.status === "sent" || q.status === "accepted"),
    latestQuoteStatus: proposals[0]?.status ?? null,
    contract: contracts[0] ?? null,
    invoices: invoices.map((i) => ({ invoice_type: i.invoice_type, status: i.status })),
    renewalDate: client.renewal_date,
    manualStage,
  });
  const currentOrder = STAGE_ORDER[lifecycle.stage];

  const next = computeNextStep(
    { clientId: client.id, notes: client.notes, renewalDate: client.renewal_date, stage: lifecycle.stage, sows, quotes: proposals, contracts, invoices },
    here,
  );

  const contract = contracts[0] ?? null;
  const packageQuoteId = contract?.quote_id ?? proposals[0]?.id ?? null;

  // Care plan: the agreement's monthly allocation vs. what has been logged this month.
  const snapshot = (contract as unknown as { snapshot?: Partial<ContractSnapshot> } | null)?.snapshot;
  const allocatedHours = Number(snapshot?.monthly_hours ?? 0);
  const thisMonth = todayISO().slice(0, 7);
  const usedThisMonth = careEntries.filter((e) => e.month.startsWith(thisMonth)).reduce((s, e) => s + Number(e.hours), 0);
  const overAllocation = allocatedHours > 0 && usedThisMonth > allocatedHours;
  const monthLabel = (ym: string) => new Date(ym.slice(0, 7) + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const signLink = contract ? signLinkFor(contract.sign_token) : null;
  const firstName = String(client.name ?? "").split(/\s+/)[0] || "there";
  const mailto =
    signLink && client.email
      ? `mailto:${client.email}?subject=${encodeURIComponent("Your proposal from Rooted Tech Solutions")}&body=${encodeURIComponent(
          `Hi ${firstName},\n\nHere is the proposal we discussed. The quote, scope of work and service agreement are together in one place, and you can review and sign online:\n\n${signLink}\n\nThe deposit invoice follows once it is signed. Reply here with any questions.\n\nRooted Tech Solutions`,
        )}`
      : null;

  const contractTotal = (q: QuoteRow) => (q.build_total ?? 0) + annualValue(q.monthly_retainer);
  const paidOf = (type: string) => invoices.some((i) => i.invoice_type === type && i.status === "paid");
  const anyOf = (type: string) => invoices.some((i) => i.invoice_type === type && i.status !== "cancelled");
  const newInvoiceHref = (type: string) =>
    `/dashboard/invoices/new?client_id=${client.id}&from=${back}&invoice_type=${type}${packageQuoteId ? `&quote_id=${packageQuoteId}` : ""}`;
  const renewalDays = daysUntil(client.renewal_date);

  // ── Server actions bound to this client ─────────────────────────────────
  // Inline actions may only reference plain locals. Next's compiler hoists
  // every member expression an action uses (e.g. `contract.id`) into its
  // encrypted bound arguments and evaluates it at render time — so touching a
  // nullable object inside one of these throws before the page can render.
  const clientId: string = client.id;
  const clientEmail: string | null = client.email ?? null;
  const mode = stripeMode();
  const nextAction = next.action;
  const contractId: string | null = contract?.id ?? null;

  async function handleDeleteClient() {
    "use server";
    await deleteClientRecord(clientId);
  }
  async function runNextStep() {
    "use server";
    const a = nextAction;
    if (!a) return;
    if (a.kind === "send-package") await sendPackage(a.contractId);
    else if (a.kind === "generate-contract") await generateContractFromQuote(a.quoteId);
    else if (a.kind === "mark-paid") await markInvoicePaid(a.invoiceId, clientId);
  }
  async function handleSendPackage() {
    "use server";
    if (contractId) await sendPackage(contractId);
  }

  const nextActionButton =
    "inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-dark shadow-sm transition-colors hover:bg-brand-cream";

  return (
    <div className="p-4 md:p-8">
      <Link href="/dashboard/clients" className="text-sm font-medium text-gray-500 transition-colors hover:text-brand-dark">
        ← Back to Clients
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand-dark text-base font-bold text-white">
            {initials(label)}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-dark">{label}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {client.company && <span>{client.name}</span>}
              {client.email && (
                <a href={`mailto:${client.email}`} className="hover:text-brand-dark">
                  {client.email}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${String(client.phone).replace(/[^0-9]/g, "")}`} className="hover:text-brand-dark">
                  {client.phone}
                </a>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/clients/${client.id}/edit`} className={headerLink}>
            Edit
          </Link>
          <form action={handleDeleteClient}>
            <ConfirmButton
              label="Delete"
              confirmLabel="Delete this client?"
              disabled={hasDocuments}
              disabledReason="This client still has documents. Delete those first."
            />
          </form>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
        <span>
          <span className="font-medium text-gray-400">Contract signed</span> {fmtDay(client.contract_signed_date) ?? "—"}
        </span>
        <span>
          <span className="font-medium text-gray-400">Renewal</span> {fmtDay(client.renewal_date) ?? "—"}
          {client.renewal_date && <span className="text-gray-400"> · {renewalLabel(client.renewal_date).text.toLowerCase()}</span>}
        </span>
        {proposals[0] && proposals[0].status !== "declined" && (
          <span>
            <span className="font-medium text-gray-400">Quoted value</span> {fmtMoney(contractTotal(proposals[0]))}
          </span>
        )}
      </p>

      {searchParams.stripe && (
        <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl border px-5 py-3 text-sm font-medium ${searchParams.via === "stripe" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {searchParams.via === "stripe"
            ? `Invoice ${searchParams.stripe === "resent" ? "re-sent" : "sent"} using Stripe's own email.${searchParams.note ? ` Yours could not go out: ${searchParams.note}` : ""}`
            : `Invoice ${searchParams.stripe === "resent" ? "re-sent" : "sent"} — the client got your invoice by email with a Pay button that opens Stripe.${searchParams.transport ? ` Sent through ${searchParams.transport === "gmail" ? "Gmail" : "Resend"}.` : ""}`}
          {mode === "test" && <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">test mode</span>}
        </div>
      )}
      {searchParams.stripe_error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
          <span className="font-semibold">Stripe: </span>
          {searchParams.stripe_error}
        </div>
      )}

      {/* ── Lifecycle ──────────────────────────────────────────────────── */}
      <div className="mt-6 rounded-2xl border border-brand-light bg-white px-6 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Client lifecycle</p>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${lifecycle.color}`}>
              {lifecycle.label}
              {manualStage && <span className="ml-1.5 font-normal opacity-70">· set manually</span>}
            </span>
            <details className="relative">
              <summary className="cursor-pointer list-none text-xs font-medium text-brand-mid transition-colors hover:text-brand-dark">
                Change stage
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-brand-light bg-white p-4 shadow-lg">
                <form action={updateClientStageFromForm} className="space-y-2">
                  <input type="hidden" name="client_id" value={client.id} />
                  <label htmlFor="stage" className="block text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Set stage by hand
                  </label>
                  <select
                    id="stage"
                    name="stage"
                    defaultValue={manualStage ?? (lifecycle.stage === "overdue_renewal" ? "renewal_due" : lifecycle.stage)}
                    className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/40"
                  >
                    {LIFECYCLE_STEPS.map((s, i) => (
                      <option key={s.stage} value={s.stage}>
                        {i + 1}. {s.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={`${headerButton} w-full justify-center`}>
                    Save stage
                  </button>
                </form>
                {manualStage && (
                  <form action={clearClientStageFromForm} className="mt-2">
                    <input type="hidden" name="client_id" value={client.id} />
                    <button type="submit" className={`${headerLink} w-full justify-center`}>
                      Back to automatic
                    </button>
                  </form>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                  Automatic works the stage out from the contract and invoices. A manual stage sticks until you switch back.
                </p>
              </div>
            </details>
          </div>
        </div>

        <div className="flex items-center gap-0 overflow-x-auto pb-1 [&>div]:min-w-[5.5rem]">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const order = STAGE_ORDER[step.stage as keyof typeof STAGE_ORDER];
            const done = currentOrder > order;
            const current = currentOrder === order;
            const isLast = idx === LIFECYCLE_STEPS.length - 1;
            return (
              <div key={step.stage} className="flex min-w-0 flex-1 items-center">
                <div className="flex flex-shrink-0 flex-col items-center">
                  <form action={updateClientStageFromForm}>
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="stage" value={step.stage} />
                    <button
                      type="submit"
                      title={`Set stage: ${step.label}`}
                      aria-label={`Set stage to ${step.label}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all hover:scale-110 hover:ring-4 hover:ring-brand-dark/10 ${
                        done
                          ? "bg-brand-mid text-white"
                          : current && lifecycle.tone === "problem"
                          ? "bg-red-600 text-white ring-4 ring-red-600/20"
                          : current
                          ? "bg-brand-dark text-white ring-4 ring-brand-dark/20"
                          : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                      }`}
                    >
                      {done ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : current && lifecycle.tone === "problem" ? (
                        "!"
                      ) : (
                        idx + 1
                      )}
                    </button>
                  </form>
                  <span
                    className={`mt-1 max-w-[72px] text-center text-[10px] font-medium leading-tight ${
                      current && lifecycle.tone === "problem" ? "text-red-700" : current ? "text-brand-dark" : done ? "text-brand-mid" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && <div className={`mx-1 mb-4 h-0.5 flex-1 rounded ${done ? "bg-brand-mid" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>
        <p className={`mt-3 text-xs ${lifecycle.tone === "problem" ? "font-medium text-red-700" : "text-gray-400"}`}>{lifecycle.description}</p>
        {lifecycle.auto && lifecycle.auto.label !== lifecycle.label && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            <span>
              Set by hand. From the documents this client reads <span className="font-semibold">{lifecycle.auto.label}</span> — {lifecycle.auto.description}.
            </span>
            <form action={clearClientStageFromForm}>
              <input type="hidden" name="client_id" value={client.id} />
              <button type="submit" className="font-semibold underline-offset-2 hover:underline">
                Use that instead
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Next step ──────────────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-brand-dark px-6 py-5 text-white shadow-lg shadow-brand-dark/10">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-light/70">
            Next step
            {next.owner === "client" && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 normal-case tracking-normal text-brand-light">waiting on client</span>}
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight">{next.title}</p>
          <p className="mt-0.5 text-sm text-brand-light/80">{next.detail}</p>
        </div>
        {next.action && (
          <div className="flex flex-shrink-0 items-center gap-3">
            {next.action.kind === "link" && (
              <Link href={next.action.href} className={nextActionButton}>
                {next.action.label} →
              </Link>
            )}
            {(next.action.kind === "send-package" || next.action.kind === "generate-contract" || next.action.kind === "mark-paid") && (
              <form action={runNextStep}>
                <button type="submit" className={nextActionButton}>
                  {next.action.label} →
                </button>
              </form>
            )}
            {next.action.kind === "copy-link" && signLink && (
              <div className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
                <code className="max-w-[240px] truncate text-xs text-brand-light">{signLink}</code>
                <span className="[&>button]:mt-0 [&>button]:text-brand-light [&>button:hover]:text-white">
                  <CopyButton text={signLink} label="Copy" />
                </span>
                {mailto && (
                  <a href={mailto} className="text-xs font-semibold text-white hover:underline">
                    Email it
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── The pipeline ───────────────────────────────────────────────── */}
      <div className="relative mt-8 max-w-4xl space-y-6 before:absolute before:bottom-6 before:left-4 before:top-6 before:w-px before:bg-brand-light">
        {/* 1 · Meeting notes */}
        <Step
          n={1}
          title="Meeting notes"
          current={next.section === 1}
          summary={
            client.notes ? (
              <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-medium text-brand-dark">Captured</span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">Nothing yet</span>
            )
          }
        >
          <form action={updateClientNotesFromForm} className="space-y-3">
            <input type="hidden" name="client_id" value={client.id} />
            <textarea
              id="notes"
              name="notes"
              rows={client.notes ? Math.min(12, Math.max(4, String(client.notes).split("\n").length + 1)) : 4}
              defaultValue={client.notes ?? ""}
              placeholder="What they do today, where it hurts, what they asked for. Rough notes are fine — the scope of work starts from these."
              className="w-full rounded-lg border border-brand-light px-3 py-2 text-sm leading-relaxed text-brand-dark focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/40"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-400">Step 1 of the process. Starting a scope of work pulls these in as its discovery notes.</p>
              <button type="submit" className={headerButton}>
                Save notes
              </button>
            </div>
          </form>
        </Step>

        {/* 2 · Scope of work */}
        <Step
          n={2}
          title="Scope of work"
          current={next.section === 2}
          summary={sows[0] && <StatusBadge status={sows[0].status} />}
          actions={
            <Link href={`/dashboard/scope/new?client_id=${client.id}&from=${back}`} className={sows.length === 0 ? headerButton : headerLink}>
              + Scope of work
            </Link>
          }
        >
          {sows.length === 0 ? (
            <p className="text-sm text-gray-400">What is being built, what is not, and what you need from them.</p>
          ) : (
            <ul className="divide-y divide-brand-light">
              {sows.map((sow) => {
                async function handleDelete() {
                  "use server";
                  await deleteSowRecord(sow.id, here);
                }
                async function handleStatus(formData: FormData) {
                  "use server";
                  await updateSowStatus(sow.id, String(formData.get("status") ?? ""), clientId);
                }
                return (
                  <li key={sow.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/dashboard/scope/${sow.id}?from=${back}`} className="group block">
                        <p className="text-sm font-medium text-brand-dark transition-colors group-hover:text-brand-mid">
                          <span className="mr-2 font-mono text-xs text-gray-400">{sow.sow_number}</span>
                          {sow.title || "Untitled scope"}
                        </p>
                      </Link>
                      <Stamps items={[["Issued", sow.issued_date], ["Sent", sow.sent_at], ["Approved", sow.approved_at]]} />
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={sow.status} />
                      {sow.status === "draft" && (
                        <form action={handleStatus}>
                          <input type="hidden" name="status" value="sent" />
                          <button type="submit" className={rowPrimary}>Mark sent</button>
                        </form>
                      )}
                      {sow.status === "sent" && (
                        <form action={handleStatus}>
                          <input type="hidden" name="status" value="approved" />
                          <button type="submit" className={rowPrimary}>Approved</button>
                        </form>
                      )}
                      <Link href={`/dashboard/scope/${sow.id}/edit?from=${back}`} className={rowAction}>Edit</Link>
                      <form action={handleDelete}>
                        <ConfirmButton label="Delete" confirmLabel="Delete?" {...rowDelete} disabled={sow.status === "approved"} disabledReason="Approved scope is part of the agreement." />
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Step>

        {/* 3 · Quote */}
        <Step
          n={3}
          title="Quote"
          current={next.section === 3}
          summary={proposals[0] && <StatusBadge status={proposals[0].status} />}
          actions={
            <Link href={`/dashboard/quotes/new?client_id=${client.id}&from=${back}`} className={proposals.length === 0 ? headerButton : headerLink}>
              + Quote
            </Link>
          }
        >
          {proposals.length === 0 ? (
            <p className="text-sm text-gray-400">One price for the build plus the monthly care plan.</p>
          ) : (
            <ul className="divide-y divide-brand-light">
              {proposals.map((quote) => {
                const hasContract = contracts.some((c) => c.quote_id === quote.id);
                async function handleDelete() {
                  "use server";
                  await deleteQuoteRecord(quote.id, here);
                }
                async function handleGenerate() {
                  "use server";
                  await generateContractFromQuote(quote.id);
                }
                async function handleStatus(formData: FormData) {
                  "use server";
                  await updateQuoteStatus(quote.id, String(formData.get("status") ?? ""), clientId);
                }
                return (
                  <li key={quote.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/dashboard/quotes/${quote.id}?from=${back}`} className="group block">
                        <p className="text-sm font-medium text-brand-dark transition-colors group-hover:text-brand-mid">{quote.title}</p>
                      </Link>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {fmtMoney(quote.build_total)} build · {fmtMoney(quote.monthly_retainer)}/mo · {fmtMoney(contractTotal(quote))} total
                      </p>
                      <Stamps items={[["Sent", quote.sent_at], ["Accepted", quote.accepted_at], ["Declined", quote.declined_at]]} />
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={quote.status} />
                      {quote.status === "draft" && !hasContract && (
                        <form action={handleStatus}>
                          <input type="hidden" name="status" value="sent" />
                          <button type="submit" className={rowAction}>Mark sent</button>
                        </form>
                      )}
                      {quote.status === "sent" && (
                        <>
                          <form action={handleStatus}>
                            <input type="hidden" name="status" value="accepted" />
                            <button type="submit" className={rowAction}>Accepted</button>
                          </form>
                          <form action={handleStatus}>
                            <input type="hidden" name="status" value="declined" />
                            <button type="submit" className={rowAction}>Declined</button>
                          </form>
                        </>
                      )}
                      {!hasContract && quote.status !== "declined" && (
                        <form action={handleGenerate}>
                          <button type="submit" className={rowPrimary}>+ Contract</button>
                        </form>
                      )}
                      <Link href={`/dashboard/quotes/${quote.id}/edit?from=${back}`} className={rowAction}>Edit</Link>
                      <form action={handleDelete}>
                        <ConfirmButton label="Delete" confirmLabel="Delete?" {...rowDelete} disabled={hasContract} disabledReason="Delete its contract first." />
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Step>

        {/* 4 · Contract */}
        <Step
          n={4}
          title="Contract"
          current={next.section === 4}
          summary={contract && <StatusBadge status={contract.status} />}
        >
          {contracts.length === 0 ? (
            <p className="text-sm text-gray-400">Generated from the quote with the payment schedule built in — use “+ Contract” on a quote above.</p>
          ) : (
            <ul className="divide-y divide-brand-light">
              {contracts.map((c) => {
                async function handleDelete() {
                  "use server";
                  await deleteContractRecord(c.id, here);
                }
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/dashboard/contracts/${c.id}?from=${back}`} className="group block">
                        <p className="text-sm font-medium text-brand-dark transition-colors group-hover:text-brand-mid">
                          Service agreement{c.quotes?.title ? ` — ${c.quotes.title}` : ""}
                        </p>
                      </Link>
                      {c.signed_name ? (
                        <p className="mt-0.5 text-[11px] text-brand-mid">Signed by {c.signed_name} · {fmtDay(c.signed_at)}</p>
                      ) : (
                        <Stamps items={[["Sent", c.sent_at], ["Client opened", c.first_opened_at], ["Last opened", c.last_opened_at !== c.first_opened_at ? c.last_opened_at : null]]} />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={c.status} />
                      <Link href={`/dashboard/contracts/${c.id}?from=${back}`} className={rowAction}>View</Link>
                      <form action={handleDelete}>
                        <ConfirmButton label="Delete" confirmLabel="Delete?" {...rowDelete} disabled={c.status === "signed"} disabledReason="A signed agreement stays on record." />
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {contract?.status === "signed" && (
            <div className="mt-5 border-t border-brand-light pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Change orders</p>
                  <p className="text-[11px] text-gray-400">Work outside the agreement — priced, accepted, and billed separately.</p>
                </div>
                <Link
                  href={`/dashboard/quotes/new?client_id=${client.id}&from=${back}&kind=change_order&contract_id=${contract.id}`}
                  className={headerLink}
                >
                  + Change order
                </Link>
              </div>
              {changeOrders.length > 0 && (
                <ul className="mt-3 divide-y divide-brand-light">
                  {changeOrders.map((co) => {
                    async function handleDelete() {
                      "use server";
                      await deleteQuoteRecord(co.id, here);
                    }
                    async function handleStatus(formData: FormData) {
                      "use server";
                      await updateQuoteStatus(co.id, String(formData.get("status") ?? ""), clientId);
                    }
                    return (
                      <li key={co.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <Link href={`/dashboard/quotes/${co.id}?from=${back}`} className="group block">
                            <p className="text-sm font-medium text-brand-dark transition-colors group-hover:text-brand-mid">{co.title}</p>
                          </Link>
                          <p className="mt-0.5 text-[11px] text-gray-400">{fmtMoney(co.build_total)}</p>
                          <Stamps items={[["Sent", co.sent_at], ["Accepted", co.accepted_at], ["Declined", co.declined_at]]} />
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={co.status} />
                          {co.status === "draft" && (
                            <form action={handleStatus}>
                              <input type="hidden" name="status" value="sent" />
                              <button type="submit" className={rowAction}>Mark sent</button>
                            </form>
                          )}
                          {co.status === "sent" && (
                            <>
                              <form action={handleStatus}>
                                <input type="hidden" name="status" value="accepted" />
                                <button type="submit" className={rowAction}>Accepted</button>
                              </form>
                              <form action={handleStatus}>
                                <input type="hidden" name="status" value="declined" />
                                <button type="submit" className={rowAction}>Declined</button>
                              </form>
                            </>
                          )}
                          {co.status === "accepted" && (
                            <Link
                              href={`/dashboard/invoices/new?client_id=${client.id}&from=${back}&invoice_type=custom&quote_id=${co.id}`}
                              className={rowPrimary}
                            >
                              Invoice it
                            </Link>
                          )}
                          <Link href={`/dashboard/quotes/${co.id}/edit?from=${back}`} className={rowAction}>Edit</Link>
                          <form action={handleDelete}>
                            <ConfirmButton label="Delete" confirmLabel="Delete?" {...rowDelete} disabled={co.status === "accepted"} disabledReason="An accepted change order stays on record." />
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </Step>

        {/* 5 · Package */}
        <Step
          n={5}
          title="Client package"
          current={next.section === 5}
          summary={
            <span className="text-[11px] text-gray-400">Quote · Scope of work · Agreement — one signing link</span>
          }
          actions={
            packageQuoteId ? (
              <Link href={`/dashboard/quotes/${packageQuoteId}/preview`} className={headerLink}>
                Preview package
              </Link>
            ) : undefined
          }
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {[
                ["Scope of work", sows.length > 0],
                ["Quote", proposals.length > 0],
                ["Agreement", contracts.length > 0],
              ].map(([name, ok]) => (
                <li key={String(name)} className={`flex items-center gap-1.5 ${ok ? "text-brand-dark" : "text-gray-400"}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${ok ? "bg-brand-mid text-white" : "bg-gray-200 text-gray-500"}`}>
                    {ok ? "✓" : "·"}
                  </span>
                  {name}
                </li>
              ))}
            </ul>

            {!contract && <p className="text-sm text-gray-400">Generate the agreement to complete the package.</p>}

            {contract?.status === "draft" && proposals[0]?.status === "declined" && (
              <p className="text-sm font-medium text-red-700">The quote was declined — revise it and generate a fresh agreement before sending.</p>
            )}

            {contract?.status === "draft" && proposals[0]?.status !== "declined" && (
              <form action={handleSendPackage}>
                <button type="submit" className={headerButton}>
                  Send the package
                </button>
              </form>
            )}
          </div>

          {contract && contract.status !== "draft" && signLink && (
            <div className="mt-4 rounded-xl border border-brand-light bg-brand-cream px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
                    {contract.status === "signed" ? "Signed" : "Awaiting signature"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {contract.status === "signed"
                      ? `${contract.signed_name} signed on ${fmtDay(contract.signed_at)}.`
                      : `Sent ${fmtDay(contract.sent_at) ?? "—"}. ${
                          contract.first_opened_at
                            ? `Opened by the client ${fmtDay(contract.last_opened_at ?? contract.first_opened_at)}.`
                            : "Not opened yet."
                        } They review all three documents and sign at this link.`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="max-w-[260px] truncate rounded-md bg-white px-2 py-1 text-[11px] text-brand-dark ring-1 ring-brand-light">{signLink}</code>
                  <span className="[&>button]:mt-0">
                    <CopyButton text={signLink} label="Copy link" />
                  </span>
                  {mailto ? (
                    <a href={mailto} className={headerLink}>
                      Email the link
                    </a>
                  ) : (
                    <span className="text-[11px] text-gray-400">Add an email to the client to send it from here.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </Step>

        {/* 6 · Invoices */}
        <Step
          n={6}
          title="Invoices"
          current={next.section === 6}
          summary={
            invoices.length > 0 && (
              <span className="text-[11px] text-gray-400">
                {fmtMoney(invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount ?? 0), 0))} paid
              </span>
            )
          }
          actions={
            <>
              {(contract?.status === "signed" || currentOrder >= STAGE_ORDER.quote_accepted) && !anyOf("deposit") && (
                <Link href={newInvoiceHref("deposit")} className={headerButton}>+ Deposit invoice</Link>
              )}
              {(paidOf("deposit") || currentOrder >= STAGE_ORDER.deposit_paid) && !anyOf("final_payment") && (
                <Link href={newInvoiceHref("final_payment")} className={headerButton}>+ Final invoice</Link>
              )}
              {(paidOf("final_payment") || currentOrder >= STAGE_ORDER.final_paid) && renewalDays !== null && renewalDays <= 60 && !invoices.some((i) => i.invoice_type === "annual_renewal" && i.status !== "paid" && i.status !== "cancelled") && (
                <Link href={newInvoiceHref("annual_renewal")} className={headerButton}>+ Renewal invoice</Link>
              )}
              <Link href={`/dashboard/invoices/new?client_id=${client.id}&from=${back}&invoice_type=custom${packageQuoteId ? `&quote_id=${packageQuoteId}` : ""}`} className={headerLink}>
                + Invoice
              </Link>
            </>
          }
        >
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-400">Deposit on signing, balance on delivery, then the annual renewal — each one prefilled from the agreement.</p>
          ) : (
            <ul className="divide-y divide-brand-light">
              {invoices.map((inv) => {
                const status = effectiveInvoiceStatus(inv);
                async function handleMarkPaid() {
                  "use server";
                  await markInvoicePaid(inv.id, clientId);
                }
                async function handleMarkSent() {
                  "use server";
                  await markInvoiceSent(inv.id, clientId);
                }
                async function handleStripe() {
                  "use server";
                  await sendInvoiceViaStripe(inv.id, here);
                }
                async function handleDelete() {
                  "use server";
                  await deleteInvoiceRecord(inv.id, here);
                }
                return (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/dashboard/invoices/${inv.id}?from=${back}`} className="group block">
                        <p className="truncate text-sm font-medium text-brand-dark transition-colors group-hover:text-brand-mid">
                          <span className="mr-2 font-mono text-xs text-gray-400">{inv.invoice_number}</span>
                          {inv.title}
                        </p>
                      </Link>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {fmtMoney(inv.amount)}
                        {inv.invoice_type && inv.invoice_type !== "custom" && <span className="ml-1.5 text-brand-mid">· {INVOICE_TYPE_LABEL[inv.invoice_type] ?? inv.invoice_type}</span>}
                        {inv.due_date && <span> · due {fmtDay(inv.due_date)}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={status} />
                      {inv.stripe_hosted_url && (
                        <span className="[&>button]:mt-0">
                          <CopyButton text={inv.stripe_hosted_url} label="Pay link" />
                        </span>
                      )}
                      {mode && clientEmail && inv.status !== "paid" && inv.status !== "cancelled" && (
                        <form action={handleStripe}>
                          <button type="submit" className={rowPrimary}>{inv.stripe_invoice_id ? "Re-send" : "Send via Stripe"}</button>
                        </form>
                      )}
                      {inv.status === "draft" && (
                        <form action={handleMarkSent}>
                          <button type="submit" className={mode ? rowAction : rowPrimary}>{mode ? "Mark sent" : "Mark sent"}</button>
                        </form>
                      )}
                      {inv.status !== "paid" && inv.status !== "cancelled" && inv.status !== "draft" && (
                        <form action={handleMarkPaid}>
                          <button type="submit" className={rowPrimary}>Mark paid</button>
                        </form>
                      )}
                      <Link href={`/dashboard/invoices/${inv.id}/edit?from=${back}`} className={rowAction}>Edit</Link>
                      <form action={handleDelete}>
                        <ConfirmButton label="Delete" confirmLabel="Delete?" {...rowDelete} disabled={inv.status === "paid"} disabledReason="Paid invoices are part of the books." />
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Step>

        {/* 7 · Care plan — the fifth public step, "It keeps working" */}
        {contract?.status === "signed" && (
          <Step
            n={7}
            title="Care plan"
            current={false}
            summary={
              <span className="text-[11px] text-gray-400">
                {allocatedHours > 0 ? `${allocatedHours} hours a month in the agreement` : "No monthly hours in the agreement"}
              </span>
            }
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-semibold text-brand-dark">{monthLabel(thisMonth)}</p>
                  <p className={`text-sm ${overAllocation ? "font-semibold text-red-700" : "text-brand-dark"}`}>
                    {usedThisMonth} of {allocatedHours} h used
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full ${overAllocation ? "bg-red-500" : "bg-brand-mid"}`}
                    style={{ width: `${allocatedHours > 0 ? Math.min(100, (usedThisMonth / allocatedHours) * 100) : 0}%` }}
                  />
                </div>
                {overAllocation && (
                  <p className="mt-1.5 text-xs text-red-700">
                    Over the monthly allocation. The agreement says extra work is quoted separately — a change order, not a favour.
                  </p>
                )}

                {careEntries.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400">Nothing logged yet.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-brand-light">
                    {careEntries.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <span className="font-medium text-brand-dark">{Number(e.hours)} h</span>
                          <span className="ml-2 text-gray-400">{monthLabel(e.month)}</span>
                          {e.note && <span className="ml-2 text-gray-600">· {e.note}</span>}
                        </div>
                        <form action={deleteCareHoursFromForm}>
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="client_id" value={clientId} />
                          <ConfirmButton label="Delete" confirmLabel="Delete?" {...rowDelete} />
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form action={addCareHoursFromForm} className="space-y-2.5 rounded-xl border border-brand-light bg-brand-cream/50 p-4">
                <input type="hidden" name="client_id" value={clientId} />
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Log hours</p>
                <label className="block text-[11px] font-medium text-gray-500">
                  Month
                  <input type="month" name="month" defaultValue={thisMonth} className="mt-1 w-full rounded-lg border border-brand-light bg-white px-2.5 py-1.5 text-sm text-brand-dark" />
                </label>
                <label className="block text-[11px] font-medium text-gray-500">
                  Hours
                  <input type="number" name="hours" step="0.25" min="0.25" required placeholder="1.5" className="mt-1 w-full rounded-lg border border-brand-light bg-white px-2.5 py-1.5 text-sm text-brand-dark" />
                </label>
                <label className="block text-[11px] font-medium text-gray-500">
                  What for
                  <input name="note" placeholder="Fixed the invoice export" className="mt-1 w-full rounded-lg border border-brand-light bg-white px-2.5 py-1.5 text-sm text-brand-dark" />
                </label>
                <button type="submit" className={`${headerButton} w-full justify-center`}>
                  Log hours
                </button>
              </form>
            </div>
          </Step>
        )}
      </div>

      {/* ── Activity ───────────────────────────────────────────────────── */}
      <div className="mt-10 max-w-4xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-dark">Activity</h2>
          <p className="text-[11px] text-gray-400">Everything that happened with this client, newest first</p>
        </div>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-brand-light bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-400">Nothing recorded yet. Actions from here on are logged automatically.</p>
          </div>
        ) : (
          <ol className="relative divide-y divide-brand-light rounded-2xl border border-brand-light bg-white shadow-sm">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                    ev.actor === "client" ? "bg-brand-mid" : ev.actor === "system" ? "bg-gray-300" : "bg-brand-dark"
                  }`}
                  title={ev.actor === "client" ? "The client" : ev.actor === "system" ? "Automatic" : "You"}
                />
                <p className="min-w-0 flex-1 text-sm text-brand-dark">{ev.summary}</p>
                <time className="flex-shrink-0 text-[11px] text-gray-400" dateTime={ev.created_at}>
                  {new Date(ev.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
