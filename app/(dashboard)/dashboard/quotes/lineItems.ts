import { startOfToday } from "@/lib/dates";

export const BUILD_ITEMS = [
  { num: "1.1", desc: "Discovery & Requirements Gathering" },
  { num: "1.2", desc: "UX/UI Design & Wireframing" },
  { num: "1.3", desc: "Frontend Development" },
  { num: "1.4", desc: "Backend / API Development" },
  { num: "1.5", desc: "Database Architecture & Setup" },
  { num: "1.6", desc: "Third-Party Integrations" },
  { num: "1.7", desc: "Testing, QA & Bug Fixes" },
  { num: "1.8", desc: "Deployment & Go-Live Support" },
  { num: "1.9", desc: "Documentation & Handover" },
];

export const MAINTENANCE_ITEMS = [
  { num: "2.1", desc: "Hosting & Infrastructure Management" },
  { num: "2.2", desc: "Security Updates & Patch Management" },
  { num: "2.3", desc: "Bug Fixes & Performance Monitoring" },
  { num: "2.4", desc: "Feature Updates & Minor Enhancements" },
  { num: "2.5", desc: "Backups & Disaster Recovery" },
  { num: "2.6", desc: "Client Support & Communication" },
];

export function fmtMoney(amount: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount ?? 0);
}

export function annualValue(monthlyRetainer: number | null | undefined) {
  return (monthlyRetainer ?? 0) * 12;
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
}

export function renewalLabel(dateStr: string | null | undefined): { text: string; tone: "overdue" | "soon" | "normal" | "none" } {
  const days = daysUntil(dateStr);
  if (days === null) return { text: "No renewal date", tone: "none" };
  if (days < 0) return { text: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`, tone: "overdue" };
  if (days === 0) return { text: "Renews today", tone: "soon" };
  if (days <= 30) return { text: `Renews in ${days} day${days === 1 ? "" : "s"}`, tone: "soon" };
  return { text: `Renews in ${days} days`, tone: "normal" };
}

export function quoteNumber(id: string, createdAt: string | null | undefined) {
  const date = createdAt ? new Date(createdAt) : new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const suffix = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `QTE-${stamp}-${suffix}`;
}

/**
 * How the nine build line items roll up for anyone who is not pricing the job.
 * A client reads three phases, not nine rows of hours × rate. The marketing
 * site groups its "What we build" cards with this same table, so what is
 * advertised is literally what is quoted.
 */
export const BUILD_PHASES = [
  {
    key: "plan",
    title: "Plan",
    blurb: "Working out how the work moves through your business today, and designing the screens before anything is built.",
    items: ["1.1", "1.2"],
  },
  {
    key: "build",
    title: "Build",
    blurb: "The application itself — the screens your team uses, the logic underneath, the database, and connections to the tools you already pay for.",
    items: ["1.3", "1.4", "1.5", "1.6"],
  },
  {
    key: "launch",
    title: "Launch",
    blurb: "Tested, deployed, and handed over with documentation — so you are never locked out of something you paid for.",
    items: ["1.7", "1.8", "1.9"],
  },
] as const;

type Priced = { num: string; desc: string; hours: number; rate: number };

export type PhaseSummary = {
  key: string;
  title: string;
  blurb: string;
  /** The line-item descriptions this quote actually includes for the phase. */
  included: string[];
  hours: number;
  total: number;
};

export function sumItems(items: Priced[]) {
  return items.reduce(
    (acc, it) => ({ hours: acc.hours + (it.hours || 0), total: acc.total + (it.hours || 0) * (it.rate || 0) }),
    { hours: 0, total: 0 },
  );
}

/**
 * Roll a quote's build items up into phases, keeping only phases the quote
 * actually contains. Items whose number matches no phase (custom rows) are
 * gathered under "Additional work" so nothing priced ever goes unshown.
 */
export function summarizeBuild(items: Priced[]): PhaseSummary[] {
  const used = new Set<Priced>();
  const out: PhaseSummary[] = [];
  for (const phase of BUILD_PHASES) {
    const mine = items.filter((it) => (phase.items as readonly string[]).includes(it.num));
    if (mine.length === 0) continue;
    mine.forEach((it) => used.add(it));
    const { hours, total } = sumItems(mine);
    out.push({ key: phase.key, title: phase.title, blurb: phase.blurb, included: mine.map((it) => it.desc), hours, total });
  }
  const rest = items.filter((it) => !used.has(it) && it.desc.trim() !== "");
  if (rest.length > 0) {
    const { hours, total } = sumItems(rest);
    out.push({ key: "other", title: "Additional work", blurb: "", included: rest.map((it) => it.desc), hours, total });
  }
  return out;
}
