import { startOfToday } from "@/lib/dates";

export type InvoiceStatusInput = { status: string; due_date: string | null };

/**
 * What an invoice *is* today, regardless of what was typed into its status
 * field. "overdue" is a fact about the calendar, not a state to maintain by
 * hand: a sent invoice past its due date is overdue. The stored status is
 * left alone so nothing needs a nightly job.
 */
export function effectiveInvoiceStatus(inv: InvoiceStatusInput, today: Date = startOfToday()): string {
  if (inv.status !== "sent" || !inv.due_date) return inv.status;
  const due = new Date(inv.due_date + "T00:00:00");
  return due < today ? "overdue" : inv.status;
}

export function daysPastDue(inv: InvoiceStatusInput, today: Date = startOfToday()): number {
  if (!inv.due_date) return 0;
  const due = new Date(inv.due_date + "T00:00:00");
  return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86400000));
}
