import type { LineItem } from "../quotes/actions";
import { annualValue, fmtMoney } from "../quotes/lineItems";

export type ContractSnapshot = {
  client_name: string | null;
  client_company: string | null;
  project_name: string | null;
  scope: string | null;
  sow_number: string | null;    // e.g. "SOW-001"
  sow_date: string | null;      // ISO date string
  maintenance_items: LineItem[];
  monthly_hours: number;
  annual_hours: number;
  monthly_retainer: number;
  annual_value: number;
  build_total: number;
  generated_at: string;
};

export function buildContractSnapshot(
  quote: {
    project_name: string | null;
    scope: string | null;
    maintenance_items: LineItem[] | null;
    monthly_retainer: number | null;
    build_total: number | null;
  },
  client: { name: string | null; company: string | null } | null,
  sow?: { sow_number: string; issued_date: string | null } | null,
): ContractSnapshot {
  const maintenance_items = quote.maintenance_items ?? [];
  const monthly_hours = maintenance_items.reduce((sum, item) => sum + (item.hours || 0), 0);
  const monthly_retainer = quote.monthly_retainer ?? 0;

  return {
    client_name: client?.name ?? null,
    client_company: client?.company ?? null,
    project_name: quote.project_name,
    scope: quote.scope,
    sow_number: sow?.sow_number ?? null,
    sow_date: sow?.issued_date ?? null,
    maintenance_items,
    monthly_hours,
    annual_hours: monthly_hours * 12,
    monthly_retainer,
    annual_value: annualValue(monthly_retainer),
    build_total: quote.build_total ?? 0,
    generated_at: new Date().toISOString(),
  };
}

export function contractClauses(snapshot: ContractSnapshot): { title: string; body: string }[] {
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
