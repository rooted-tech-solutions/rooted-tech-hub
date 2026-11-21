import type { LineItem } from "./actions";
import { MAINTENANCE_ITEMS } from "./lineItems";

/**
 * Maintenance & Hosting: what the client pays each year to keep the software
 * hosted, secure and working after launch. (It used to be the "care plan",
 * priced as hours × rate per task per month and then multiplied by 12.)
 *
 * A quote now carries one annual price and a plain description of what it
 * covers — migration 011 adds quotes.maintenance_annual and
 * quotes.maintenance_description. Quotes and agreements written before that
 * still have only monthly_retainer and itemized maintenance_items, so every
 * reader goes through these helpers, which fall back to the old shape.
 */
export const MAINTENANCE_LABEL = "Maintenance & Hosting";

/** Prefilled on a new quote: the standard coverage, one item per line. */
export const DEFAULT_MAINTENANCE_DESCRIPTION = MAINTENANCE_ITEMS.map((i) => i.desc).join("\n");

export type Maintenance = {
  /** The yearly price. */
  annual: number;
  /** What it covers, as typed. */
  description: string;
  /** The description split into lines, bullets stripped, blanks dropped. */
  lines: string[];
};

type QuoteLike = {
  maintenance_annual?: number | string | null;
  maintenance_description?: string | null;
  maintenance_items?: LineItem[] | null;
  monthly_retainer?: number | string | null;
};

type SnapshotLike = {
  annual_value?: number | string | null;
  maintenance_description?: string | null;
  maintenance_items?: LineItem[] | null;
  monthly_retainer?: number | string | null;
};

function linesOf(description: string) {
  return description
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

function build(annual: number, description: string): Maintenance {
  const clean = description.trim();
  return { annual: Number.isFinite(annual) ? annual : 0, description: clean, lines: linesOf(clean) };
}

function legacyDescription(items: LineItem[] | null | undefined) {
  return (items ?? []).map((item) => item.desc).filter((d) => d && d.trim() !== "").join("\n");
}

/** From a quote row. */
export function maintenanceOf(quote: QuoteLike | null | undefined): Maintenance {
  if (!quote) return build(0, "");
  const annual =
    quote.maintenance_annual !== null && quote.maintenance_annual !== undefined && quote.maintenance_annual !== ""
      ? Number(quote.maintenance_annual)
      : Number(quote.monthly_retainer ?? 0) * 12;
  const description = quote.maintenance_description ?? legacyDescription(quote.maintenance_items);
  return build(annual, description);
}

/** From an agreement's frozen snapshot. */
export function maintenanceOfSnapshot(snapshot: SnapshotLike | null | undefined): Maintenance {
  if (!snapshot) return build(0, "");
  const annual =
    snapshot.annual_value !== null && snapshot.annual_value !== undefined
      ? Number(snapshot.annual_value)
      : Number(snapshot.monthly_retainer ?? 0) * 12;
  const description = snapshot.maintenance_description ?? legacyDescription(snapshot.maintenance_items);
  return build(annual, description);
}
