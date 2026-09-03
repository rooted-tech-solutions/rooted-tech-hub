import { startOfToday } from "@/lib/dates";

export type LifecycleStage =
  | "prospect"
  | "quoted"
  | "quote_accepted"
  | "deposit_paid"
  | "final_paid"
  | "active"
  | "renewal_due"
  | "overdue_renewal";

export type LifecycleInfo = {
  stage: LifecycleStage;
  label: string;
  description: string;
  color: string; // Tailwind classes for badge
  /** "problem" marks a stage the client is stuck at — a declined quote or agreement. */
  tone?: "ok" | "problem";
  /**
   * Present only when a manual stage is in force: what the documents alone
   * would say. The client page shows it when it disagrees, so an override
   * never quietly hides reality (a declined quote under "Quoted", say).
   */
  auto?: LifecycleInfo;
};

type Invoice = { invoice_type: string | null; status: string };
type Contract = { status: string } | null;

/** Map a manual stage key to its LifecycleInfo (used when client has a manual override) */
const MANUAL_STAGE_INFO: Record<Exclude<LifecycleStage, "overdue_renewal">, Omit<LifecycleInfo, "stage">> = {
  prospect:       { label: "Prospect",        description: "Initial contact — no quote yet",                color: "bg-gray-100 text-gray-500 ring-1 ring-gray-200" },
  quoted:         { label: "Quoted",           description: "Quote sent to client",                          color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  quote_accepted: { label: "Quote Accepted",   description: "Quote accepted — contract ready to generate",  color: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
  deposit_paid:   { label: "Deposit Paid",     description: "Deposit received — build in progress",         color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
  final_paid:     { label: "Final Paid",       description: "Final payment received",                       color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  active:         { label: "Active",           description: "Active client",                                 color: "bg-brand-light text-brand-dark ring-1 ring-brand-mid/20" },
  renewal_due:    { label: "Up for Renewal",   description: "Renewal coming up",                            color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
};

const PROBLEM = "bg-red-50 text-red-700 ring-1 ring-red-200";

function fmtRenewal(renewalDate: string) {
  return new Date(renewalDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function computeLifecycle(opts: {
  /** True only when at least one quote has status "sent" or "accepted" */
  hasQuote: boolean;
  /** Status of the newest quote — a declined one changes the story. */
  latestQuoteStatus?: string | null;
  contract: Contract;
  invoices: Invoice[];
  renewalDate: string | null;
  /** Optional manual override stored on the client record */
  manualStage?: string | null;
}): LifecycleInfo {
  const { hasQuote, latestQuoteStatus, contract, invoices, renewalDate, manualStage } = opts;

  const auto = fromDocuments({ hasQuote, latestQuoteStatus, contract, invoices, renewalDate });

  // Manual override — use stored stage directly, but carry the automatic
  // reading along so the UI can flag a disagreement.
  if (manualStage && manualStage in MANUAL_STAGE_INFO) {
    const stage = manualStage as Exclude<LifecycleStage, "overdue_renewal">;
    const info = MANUAL_STAGE_INFO[stage];
    const description =
      (stage === "active" || stage === "renewal_due") && renewalDate ? `Renews ${fmtRenewal(renewalDate)}` : info.description;
    return { stage, ...info, description, auto };
  }

  return auto;
}

function fromDocuments({
  hasQuote,
  latestQuoteStatus,
  contract,
  invoices,
  renewalDate,
}: {
  hasQuote: boolean;
  latestQuoteStatus?: string | null;
  contract: Contract;
  invoices: Invoice[];
  renewalDate: string | null;
}): LifecycleInfo {
  const paid = (type: string) => invoices.some((inv) => inv.invoice_type === type && inv.status === "paid");

  const depositPaid = paid("deposit");
  const finalPaid = paid("final_payment");
  const contractSigned = contract?.status === "signed";

  const today = startOfToday();

  let daysUntilRenewal: number | null = null;
  if (renewalDate) {
    const rd = new Date(renewalDate + "T00:00:00");
    daysUntilRenewal = Math.round((rd.getTime() - today.getTime()) / 86400000);
  }

  // Walk the lifecycle in order, return the furthest reached
  if (finalPaid) {
    if (daysUntilRenewal !== null && daysUntilRenewal < 0) {
      return {
        stage: "overdue_renewal",
        label: "Renewal Overdue",
        description: `Renewal was ${Math.abs(daysUntilRenewal)} day${Math.abs(daysUntilRenewal) === 1 ? "" : "s"} ago`,
        color: "bg-red-100 text-red-700 ring-1 ring-red-200",
      };
    }
    if (daysUntilRenewal !== null && daysUntilRenewal <= 60) {
      return {
        stage: "renewal_due",
        label: "Up for Renewal",
        description: `Renews in ${daysUntilRenewal} day${daysUntilRenewal === 1 ? "" : "s"}`,
        color: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      };
    }
    return {
      stage: "active",
      label: "Active",
      description: renewalDate ? `Renews ${fmtRenewal(renewalDate)}` : "Active client",
      color: "bg-brand-light text-brand-dark ring-1 ring-brand-mid/20",
    };
  }

  if (depositPaid) {
    return {
      stage: "deposit_paid",
      label: "Build in Progress",
      description: "Deposit paid — awaiting final delivery",
      color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    };
  }

  if (contractSigned) {
    return {
      stage: "quote_accepted",
      label: "Quote Accepted",
      description: "Contract signed — awaiting deposit invoice",
      color: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    };
  }

  // Stuck states. Nothing was paid or signed, and the newest document was
  // turned down — the stepper must say so rather than "Quoted".
  if (contract?.status === "declined") {
    return {
      stage: "quoted",
      label: "Contract Declined",
      description: "The agreement was declined — revise the quote and send a fresh one",
      color: PROBLEM,
      tone: "problem",
    };
  }
  if (latestQuoteStatus === "declined") {
    return {
      stage: "quoted",
      label: "Quote Declined",
      description: "Revise the quote and send it again, or leave the client as a prospect",
      color: PROBLEM,
      tone: "problem",
    };
  }

  if (hasQuote) {
    return {
      stage: "quoted",
      label: "Quoted",
      description: contract ? "Contract awaiting signature" : "Awaiting contract & signature",
      color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    };
  }

  return {
    stage: "prospect",
    label: "Prospect",
    description: latestQuoteStatus === "draft" ? "Quote drafted — not sent yet" : "No quote yet",
    color: "bg-gray-100 text-gray-500 ring-1 ring-gray-200",
  };
}

export const LIFECYCLE_STEPS = [
  { stage: "prospect",       label: "Prospect" },
  { stage: "quoted",         label: "Quoted" },
  { stage: "quote_accepted", label: "Quote Accepted" },
  { stage: "deposit_paid",   label: "Deposit" },
  { stage: "final_paid",     label: "Final Payment" },
  { stage: "active",         label: "Active" },
  { stage: "renewal_due",    label: "Renewal" },
] as const;

export const STAGE_ORDER: Record<LifecycleStage, number> = {
  prospect:       0,
  quoted:         1,
  quote_accepted: 2,
  deposit_paid:   3,
  final_paid:     4,
  active:         5,
  renewal_due:    6,
  overdue_renewal: 6,
};
