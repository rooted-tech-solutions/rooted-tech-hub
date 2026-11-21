import { fmtMoney } from "./lineItems";
import { MAINTENANCE_LABEL } from "./maintenance";

/**
 * The pieces every rendering of a quote shares — the owner's quote page, the
 * package preview, and the client's signing page. They are laid out for a
 * phone first (stacked, wrapping) and widen at `sm`, which printing to PDF
 * also reaches, so the printed document keeps its two-column shape.
 */

export function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="mb-0.5 grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-x-2.5 sm:grid-cols-[88px_minmax(0,1fr)]">
      <span className="whitespace-nowrap text-[10.5px] font-semibold text-brand-dark">{label}</span>
      <span className="break-words border-b border-dashed border-brand-light pb-0.5 text-[11px] text-brand-dark">{value || "—"}</span>
    </div>
  );
}

export function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-brand-light bg-brand-cream px-4 py-3.5">
      <p className="mb-2.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark">{title}</p>
      {children}
    </div>
  );
}

/** The project scope is a paragraph, not a field — it gets the full width. */
export function ScopeBlock({ scope }: { scope: string | null | undefined }) {
  if (!scope || !scope.trim()) return null;
  return (
    <div className="min-w-0 rounded-lg border border-brand-light bg-brand-cream px-4 py-3.5 sm:col-span-2">
      <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark">Scope</p>
      <p className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-brand-dark">{scope.trim()}</p>
    </div>
  );
}

function Row({ label, note, amount, tone = "line" }: { label: string; note?: string; amount: number; tone?: "breakdown" | "total" | "line" }) {
  const labelClass = {
    breakdown: "text-xs uppercase tracking-wide text-gray-500",
    total: "text-sm font-bold uppercase tracking-wide text-brand-dark",
    line: "text-xs font-semibold text-brand-dark",
  }[tone];
  const amountClass = { breakdown: "text-sm font-medium", total: "text-xl font-bold", line: "text-sm font-semibold" }[tone];
  return (
    <div className={`flex items-center justify-between gap-4 px-4 sm:px-5 ${tone === "total" ? "bg-brand-dark/5 py-3" : "py-2.5"}`}>
      <div className="min-w-0">
        <span className={labelClass}>{label}</span>
        {note && <span className="block text-[10px] normal-case text-gray-400 sm:ml-2 sm:inline">{note}</span>}
      </div>
      <span className={`whitespace-nowrap text-brand-dark ${amountClass}`}>{fmtMoney(amount)}</span>
    </div>
  );
}

/** Build + first year of Maintenance & Hosting, then the three invoices that pay for it. */
export function QuoteTotals({ buildTotal, annual }: { buildTotal: number | null | undefined; annual: number }) {
  const build = buildTotal ?? 0;
  const contractTotal = build + annual;
  const half = contractTotal / 2;
  return (
    <div className="ml-auto max-w-2xl space-y-3">
      <div className="divide-y divide-brand-light overflow-hidden rounded-lg border border-brand-light bg-brand-light/40">
        <Row tone="breakdown" label="Build Total" amount={build} />
        {annual > 0 && <Row tone="breakdown" label={MAINTENANCE_LABEL} note="First year" amount={annual} />}
        <Row tone="total" label="Total Contract Value" amount={contractTotal} />
      </div>
      <div className="divide-y divide-brand-light overflow-hidden rounded-lg border border-brand-light bg-brand-cream">
        <Row label="Invoice 1 — Deposit" note="Due upon contract signing" amount={half} />
        <Row label="Invoice 2 — Final Payment" note="Due upon delivery & acceptance" amount={half} />
        {annual > 0 && <Row label={`${MAINTENANCE_LABEL} Renewal`} note="Due each year on the renewal date" amount={annual} />}
      </div>
    </div>
  );
}

/** The "Payment Terms & Notes" bullets for a proposal. */
export function paymentNotes({ buildTotal, annual, validity }: { buildTotal: number | null | undefined; annual: number; validity: string }) {
  const half = ((buildTotal ?? 0) + annual) / 2;
  return [
    `A 50% deposit of ${fmtMoney(half)} is due upon contract signing to begin work.`,
    `The remaining 50% of ${fmtMoney(half)} is due upon final delivery and client acceptance.`,
    ...(annual > 0
      ? [`${MAINTENANCE_LABEL} renews at ${fmtMoney(annual)}/year on the renewal date. Cancellation prior to renewal is prorated for unused months.`]
      : []),
    "Scope changes or additional features will be quoted separately via written change order.",
    validity,
  ];
}
