import type { LineItem } from "../quotes/actions";
import { fmtMoney } from "../quotes/lineItems";
import { MAINTENANCE_LABEL, maintenanceOf, maintenanceOfSnapshot } from "../quotes/maintenance";

export type ContractSnapshot = {
  client_name: string | null;
  client_company: string | null;
  project_name: string | null;
  scope: string | null;
  sow_number: string | null;    // e.g. "SOW-001"
  sow_date: string | null;      // ISO date string
  /**
   * Present on agreements generated after the switch to Maintenance & Hosting
   * (one yearly price, no hours). Its presence is what selects the current
   * clause wording; older agreements keep the wording they were written with.
   */
  maintenance_description?: string;
  /** Legacy (care plan): itemized monthly tasks and the hours they added up to. Empty/0 on new agreements. */
  maintenance_items: LineItem[];
  monthly_hours: number;
  annual_hours: number;
  monthly_retainer: number;
  /** The yearly Maintenance & Hosting price. */
  annual_value: number;
  build_total: number;
  generated_at: string;
};

/** An agreement written under the old hours-per-month care plan. */
export function isLegacyCarePlan(snapshot: Partial<ContractSnapshot> | null | undefined) {
  return !!snapshot && typeof snapshot.maintenance_description !== "string";
}

export function buildContractSnapshot(
  quote: {
    project_name: string | null;
    scope: string | null;
    maintenance_items?: LineItem[] | null;
    monthly_retainer?: number | null;
    maintenance_annual?: number | null;
    maintenance_description?: string | null;
    build_total: number | null;
  },
  client: { name: string | null; company: string | null } | null,
  sow?: { sow_number: string; issued_date: string | null } | null,
): ContractSnapshot {
  const maintenance = maintenanceOf(quote);

  return {
    client_name: client?.name ?? null,
    client_company: client?.company ?? null,
    project_name: quote.project_name,
    scope: quote.scope,
    sow_number: sow?.sow_number ?? null,
    sow_date: sow?.issued_date ?? null,
    maintenance_description: maintenance.description,
    maintenance_items: [],
    monthly_hours: 0,
    annual_hours: 0,
    monthly_retainer: Math.round((maintenance.annual / 12) * 100) / 100,
    annual_value: maintenance.annual,
    build_total: quote.build_total ?? 0,
    generated_at: new Date().toISOString(),
  };
}

function sowSentence(snapshot: ContractSnapshot) {
  return `The full scope of services, deliverables, exclusions, and client responsibilities are defined in Scope of Work document ${snapshot.sow_number}${snapshot.sow_date ? `, dated ${new Date(snapshot.sow_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}, which is incorporated by reference into this agreement.`;
}

export function contractClauses(snapshot: ContractSnapshot): { title: string; body: string }[] {
  if (isLegacyCarePlan(snapshot)) return legacyContractClauses(snapshot);

  const maintenance = maintenanceOfSnapshot(snapshot);
  const total = (snapshot.build_total ?? 0) + maintenance.annual;
  const covers =
    maintenance.lines.length > 0
      ? `Ongoing ${MAINTENANCE_LABEL} covers: ${maintenance.lines.map((line) => line.replace(/[.;,\s]+$/, "")).join("; ")}.`
      : `Ongoing ${MAINTENANCE_LABEL} covers the services described in the accompanying quote.`;

  return [
    {
      title: "1. Scope of Services",
      body: snapshot.sow_number
        ? `${sowSentence(snapshot)} ${covers}`
        : `Rooted Tech Solutions will deliver the project described in the accompanying quote.${snapshot.scope ? ` Project scope: ${snapshot.scope.trim().replace(/[.\s]+$/, "")}.` : ""} ${covers}`,
    },
    {
      title: "2. Fees & Payment Schedule",
      body: `The total contract value is ${fmtMoney(total)}, covering the build (${fmtMoney(snapshot.build_total)}) and the first year of ${MAINTENANCE_LABEL} (${fmtMoney(maintenance.annual)}). Payment is split into two equal invoices: a deposit of ${fmtMoney(total / 2)} due upon signing, and a final payment of the same amount due upon delivery and acceptance. ${MAINTENANCE_LABEL} renews at ${fmtMoney(maintenance.annual)}/year on the renewal date.`,
    },
    {
      title: "3. Additional Work",
      body: "Work requested outside the scope of services listed above is considered additional work and will be quoted and billed separately at Rooted Tech Solutions' standard hourly rate before being performed. Rooted Tech Solutions reserves the right to decline additional work that falls outside its capacity or expertise.",
    },
    {
      title: "4. Cancellation & Proration",
      body: "Either party may cancel this agreement with 30 days' written notice. If the client cancels services prior to completing a full annual term, charges already incurred for the months of service used will stand, and any prepaid annual amount will be refunded on a prorated basis for the remaining full months of service not yet rendered.",
    },
    {
      title: "5. Acceptance",
      body: "By signing below, the client acknowledges they have read, understood, and agree to the terms outlined in this agreement and the accompanying quote.",
    },
  ];
}

/**
 * The SOW's scope-change paragraph. An agreement written under the old care
 * plan referred to its monthly hours; everything since refers to the
 * Maintenance & Hosting services instead.
 */
export function scopeChangePolicy(legacyHours = false) {
  return legacyHours
    ? "Any work requested outside the deliverables listed above — or beyond the allocated monthly hours defined in the accompanying service agreement — is considered a scope change. Scope changes will be assessed, quoted in writing, and require written approval before work begins. Rooted Tech Solutions will not perform out-of-scope work without a signed change order."
    : `Any work requested outside the deliverables listed above — or outside the ${MAINTENANCE_LABEL} services defined in the accompanying service agreement — is considered a scope change. Scope changes will be assessed, quoted in writing, and require written approval before work begins. Rooted Tech Solutions will not perform out-of-scope work without a signed change order.`;
}

/** The wording agreements were generated with before Maintenance & Hosting. Do not edit: signed agreements render from it. */
function legacyContractClauses(snapshot: ContractSnapshot): { title: string; body: string }[] {
  const clauses: { title: string; body: string }[] = [
    {
      title: "1. Scope of Services",
      body: snapshot.sow_number
        ? `The full scope of services, deliverables, exclusions, and client responsibilities are defined in Scope of Work document ${snapshot.sow_number}${snapshot.sow_date ? `, dated ${new Date(snapshot.sow_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}, which is incorporated by reference into this agreement. Ongoing maintenance services cover the items listed in that document within the allocated monthly hours below.`
        : snapshot.maintenance_items.length > 0
        ? `Rooted Tech Solutions will provide the following ongoing maintenance services: ${snapshot.maintenance_items.map((item) => item.desc).join(", ")}.${snapshot.scope ? ` Project scope: ${snapshot.scope}.` : ""}`
        : `Rooted Tech Solutions will provide ongoing maintenance and support services as outlined in the related quote.${snapshot.scope ? ` Project scope: ${snapshot.scope}.` : ""}`,
    },
    {
      title: "2. Allocated Time",
      body: `This agreement allocates approximately ${snapshot.monthly_hours} hour${
        snapshot.monthly_hours === 1 ? "" : "s"
      } of maintenance and support time per month (${snapshot.annual_hours} hours annually). This allocation covers the services listed above and is not cumulative — unused hours do not roll over to future months.`,
    },
    {
      title: "3. Fees & Payment Schedule",
      body: `The total contract value is ${fmtMoney((snapshot.build_total ?? 0) + snapshot.annual_value)}, covering the build (${fmtMoney(snapshot.build_total)}) and first year of annual maintenance (${fmtMoney(snapshot.annual_value)}). Payment is split into two equal invoices: a deposit of ${fmtMoney(((snapshot.build_total ?? 0) + snapshot.annual_value) / 2)} due upon signing, and a final payment of the same amount due upon delivery and acceptance. Annual maintenance renews at ${fmtMoney(snapshot.annual_value)}/year on the renewal date.`,
    },
    {
      title: "4. Scope Creep & Overage",
      body: "Work requested beyond the allocated monthly hours, or outside the scope of services listed above, is considered additional work and will be quoted and billed separately at Rooted Tech Solutions' standard hourly rate before being performed. Rooted Tech Solutions reserves the right to decline additional work that falls outside its capacity or expertise.",
    },
    {
      title: "5. Cancellation & Proration",
      body: "Either party may cancel this agreement with 30 days' written notice. If the client cancels services prior to completing a full annual term, charges already incurred for the months of service used will stand, and any prepaid annual amount will be refunded on a prorated basis for the remaining full months of service not yet rendered.",
    },
    {
      title: "6. Acceptance",
      body: "By signing below, the client acknowledges they have read, understood, and agree to the terms outlined in this agreement and the accompanying quote.",
    },
  ];

  return clauses;
}
