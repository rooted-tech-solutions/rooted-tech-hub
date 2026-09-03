import { SITE } from "@/lib/site";

/**
 * Calendar dates in the business's own time zone.
 *
 * "Today" on a server is whatever UTC says, and toISOString() is always UTC —
 * so an invoice issued at 7pm in Iowa was being dated tomorrow. Anything that
 * stamps or compares a date-only value (issued, due, paid, renewal) goes
 * through here and gets the calendar date in SITE.timeZone instead.
 */
export function todayISO(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Midnight of the business day — comparable with `new Date(ymd + "T00:00:00")`. */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(todayISO(now) + "T00:00:00");
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysISO(ymd: string, days: number): string {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function addYearsISO(ymd: string, years: number): string {
  const d = new Date(ymd + "T00:00:00");
  d.setFullYear(d.getFullYear() + years);
  return toISO(d);
}
