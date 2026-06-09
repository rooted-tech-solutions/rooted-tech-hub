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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
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
