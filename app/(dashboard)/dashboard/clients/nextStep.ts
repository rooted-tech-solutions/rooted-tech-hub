import { startOfToday } from "@/lib/dates";
import { STAGE_ORDER, type LifecycleStage } from "./lifecycle";

export type StepDoc = { id: string; status: string };
export type StepContract = StepDoc & {
  quote_id: string | null;
  sent_at: string | null;
  signed_at: string | null;
  sign_token?: string | null;
};
export type StepInvoice = StepDoc & { invoice_type: string | null; due_date: string | null };

export type StepInputs = {
  clientId: string;
  notes: string | null;
  renewalDate: string | null;
  /** Computed lifecycle stage, with any manual override already applied. */
  stage: LifecycleStage;
  /** Newest first, as the queries return them. */
  sows: StepDoc[];
  quotes: StepDoc[];
  contracts: StepContract[];
  invoices: StepInvoice[];
};

export type StepAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "send-package"; label: string; contractId: string }
  | { kind: "generate-contract"; label: string; quoteId: string }
  | { kind: "mark-paid"; label: string; invoiceId: string }
  | { kind: "copy-link"; label: string; token: string };

type LinkAction = Extract<StepAction, { kind: "link" }>;

export type NextStep = {
  /** Which numbered section of the client page this lives in. */
  section: 1 | 2 | 3 | 4 | 5 | 6;
  /** Whose move it is — drives the grouping on the dashboard. */
  owner: "you" | "client" | "none";
  title: string;
  detail: string;
  action?: StepAction;
  /** A plain destination for places that cannot render a form (the dashboard). */
  href: string;
};

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
}

const shortDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The one thing to do next for a client, worked out from their documents.
 *
 * Order matters. An active client's renewal beats everything; then money
 * (deposit, final); then the document chain notes → scope → quote →
 * contract → package. The manual lifecycle stage acts as a floor: if the
 * stage says "Deposit paid", the next step is the final invoice even when no
 * deposit invoice was ever recorded in the Hub (it may have been paid by
 * cheque before the Hub existed).
 */
export function computeNextStep(x: StepInputs, from: string): NextStep {
  const page = `/dashboard/clients/${x.clientId}`;
  const back = encodeURIComponent(from);
  const q = `client_id=${x.clientId}&from=${back}`;
  const at = (section: NextStep["section"]) => `${page}#step-${section}`;

  const contract = x.contracts[0] ?? null;
  const quote = x.quotes[0] ?? null;
  const sow = x.sows[0] ?? null;
  const quoteId = contract?.quote_id ?? quote?.id ?? null;
  const floor = STAGE_ORDER[x.stage];

  const ofType = (t: string) => x.invoices.filter((i) => i.invoice_type === t);
  const paid = (t: string) => ofType(t).some((i) => i.status === "paid");
  const open = (t: string) => ofType(t).find((i) => i.status !== "paid" && i.status !== "cancelled") ?? null;

  const newInvoice = (type: string, label: string): LinkAction => ({
    kind: "link",
    label,
    href: `/dashboard/invoices/new?${q}&invoice_type=${type}${quoteId ? `&quote_id=${quoteId}` : ""}`,
  });
  const waitingOn = (inv: StepInvoice, what: string): NextStep => {
    const href = `/dashboard/invoices/${inv.id}?from=${encodeURIComponent(page)}`;
    if (inv.status === "draft") {
      return {
        section: 6,
        owner: "you",
        title: `${what} invoice drafted — send it`,
        detail: "Open it, send it to the client, and mark it sent.",
        action: { kind: "link", label: "Open the invoice", href },
        href,
      };
    }
    return {
      section: 6,
      owner: "client",
      title: `${what} invoice is out`,
      detail: inv.due_date
        ? `Due ${shortDate(inv.due_date + "T00:00:00")}. Mark it paid when the money lands.`
        : "Mark it paid when the money lands.",
      action: { kind: "mark-paid", label: "Mark paid", invoiceId: inv.id },
      href,
    };
  };

  // ── Care plan: final payment received (or the stage says so) ──────────────
  if (paid("final_payment") || floor >= STAGE_ORDER.final_paid) {
    const openRenewal = open("annual_renewal");
    if (openRenewal) return waitingOn(openRenewal, "Renewal");
    const days = daysUntil(x.renewalDate);
    if (days !== null && days <= 60) {
      const action = newInvoice("annual_renewal", "Create the renewal invoice");
      return {
        section: 6,
        owner: "you",
        title: days < 0 ? `Renewal was ${plural(Math.abs(days), "day")} ago — invoice it` : `Renewal in ${plural(days, "day")} — invoice it`,
        detail: "The annual care plan, billed at the agreement's yearly value.",
        action,
        href: action.href,
      };
    }
    return {
      section: 6,
      owner: "none",
      title: "Active — nothing due",
      detail: x.renewalDate
        ? `Care plan renews ${shortDate(x.renewalDate + "T00:00:00")}.`
        : "Set a renewal date on the client so the Hub can remind you.",
      href: at(6),
    };
  }

  // ── Build phase: deposit received (or the stage says so) ──────────────────
  if (paid("deposit") || floor >= STAGE_ORDER.deposit_paid) {
    const openFinal = open("final_payment");
    if (openFinal) return waitingOn(openFinal, "Final");
    const action = newInvoice("final_payment", "Create the final invoice");
    return {
      section: 6,
      owner: "you",
      title: "Build in progress",
      detail: "When you deliver and they accept, invoice the balance.",
      action,
      href: action.href,
    };
  }

  // ── Signed: agreement in hand (or the stage says quote accepted) ──────────
  if (contract?.status === "signed" || floor >= STAGE_ORDER.quote_accepted) {
    const openDeposit = open("deposit");
    if (openDeposit) return waitingOn(openDeposit, "Deposit");
    const action = newInvoice("deposit", "Create the deposit invoice");
    return {
      section: 6,
      owner: "you",
      title: "Signed — invoice the deposit",
      detail: "Half of the build plus first-year care, per the agreement.",
      action,
      href: action.href,
    };
  }

  // ── Turned down: nothing signed or paid, and the newest quote was declined ─
  if (quote?.status === "declined") {
    const href = `/dashboard/quotes/${quote.id}/edit?from=${encodeURIComponent(page)}`;
    return {
      section: 3,
      owner: "you",
      title: "Quote declined — revise it",
      detail: "Change the scope or the numbers, mark it sent again, then generate a fresh agreement.",
      action: { kind: "link", label: "Edit the quote", href },
      href,
    };
  }

  // ── Package ───────────────────────────────────────────────────────────────
  if (contract?.status === "sent") {
    const when = shortDate(contract.sent_at);
    return {
      section: 5,
      owner: "client",
      title: "Awaiting signature",
      detail: `Package sent${when ? ` ${when}` : ""}. Nudge them if it has been a while.`,
      action: contract.sign_token ? { kind: "copy-link", label: "Copy signing link", token: contract.sign_token } : undefined,
      href: at(5),
    };
  }
  if (contract?.status === "declined") {
    return {
      section: 3,
      owner: "you",
      title: "Contract declined",
      detail: "Revise the quote, then generate a fresh agreement.",
      action: quote ? { kind: "link", label: "Edit the quote", href: `/dashboard/quotes/${quote.id}/edit?from=${encodeURIComponent(page)}` } : undefined,
      href: at(3),
    };
  }
  if (contract) {
    return {
      section: 5,
      owner: "you",
      title: "Send the package",
      detail: "Quote, scope of work and agreement go out together as one signing link.",
      action: { kind: "send-package", label: "Send the package", contractId: contract.id },
      href: at(5),
    };
  }

  // ── Document chain ────────────────────────────────────────────────────────
  if (quote) {
    return {
      section: 4,
      owner: "you",
      title: "Generate the contract",
      detail: "Built from the quote and frozen the moment it is sent.",
      action: { kind: "generate-contract", label: "Generate the contract", quoteId: quote.id },
      href: at(4),
    };
  }
  if (sow) {
    const href = `/dashboard/quotes/new?${q}`;
    return { section: 3, owner: "you", title: "Create the quote", detail: "Price the scope you just wrote.", action: { kind: "link", label: "Create the quote", href }, href };
  }
  if (x.notes && x.notes.trim()) {
    const href = `/dashboard/scope/new?${q}`;
    return {
      section: 2,
      owner: "you",
      title: "Write the scope of work",
      detail: "Turn the meeting notes into deliverables, exclusions, and what you need from them.",
      action: { kind: "link", label: "Write the scope", href },
      href,
    };
  }
  return {
    section: 1,
    owner: "you",
    title: "Capture the meeting notes",
    detail: "What they do today, where it hurts, and what they asked for.",
    action: { kind: "link", label: "Add notes", href: at(1) },
    href: at(1),
  };
}
