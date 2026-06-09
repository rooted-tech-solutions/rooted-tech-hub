import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteQuoteRecord } from "../actions";
import { generateContractFromQuote } from "../../contracts/actions";
import { annualValue, fmtMoney, quoteNumber } from "../lineItems";
import type { LineItem } from "../actions";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-baseline gap-x-2.5 gap-y-1 mb-0.5">
      <span className="text-[10.5px] font-semibold text-brand-dark whitespace-nowrap">{label}</span>
      <span className="text-[11px] text-brand-dark border-b border-dashed border-brand-light pb-0.5">{value || "—"}</span>
    </div>
  );
}

function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-brand-dark mt-6 mb-2.5 pb-1 border-b-[1.5px] border-brand-mid">
      <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-brand-dark text-white text-[11px] font-bold flex-shrink-0">
        {num}
      </span>
      {title}
    </div>
  );
}

function LineItemSection({
  num,
  title,
  items,
  subtotalLabel,
  subtotal,
}: {
  num: number;
  title: string;
  items: LineItem[];
  subtotalLabel: string;
  subtotal: number;
}) {
  return (
    <div>
      <SectionTitle num={num} title={title} />
      <div className="border border-brand-light rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 font-medium w-14">#</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium w-20 text-right">Hours</th>
              <th className="px-3 py-2 font-medium w-24 text-right">Rate</th>
              <th className="px-3 py-2 font-medium w-28 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.num} className="border-t border-brand-light">
                <td className="px-3 py-2 text-gray-400 font-mono text-xs">{item.num}</td>
                <td className="px-3 py-2 text-brand-dark">{item.desc}</td>
                <td className="px-3 py-2 text-right text-gray-600">{item.hours || 0}</td>
                <td className="px-3 py-2 text-right text-gray-600">{fmtMoney(item.rate)}</td>
                <td className="px-3 py-2 text-right font-medium text-brand-dark">
                  {fmtMoney((item.hours || 0) * (item.rate || 0))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-brand-light bg-brand-light/40">
              <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brand-dark">
                {subtotalLabel}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-brand-dark">{fmtMoney(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default async function QuoteDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { from?: string } }) {
  const backHref = searchParams.from ?? "/dashboard/quotes";
  const backLabel = searchParams.from ? "← Back to Client" : "← Back to Quotes";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, clients(id, name, company, email, phone)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!quote) notFound();

  const buildItems: LineItem[] = quote.build_items ?? [];
  const maintItems: LineItem[] = quote.maintenance_items ?? [];

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status")
    .eq("quote_id", quote.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  async function handleDelete() {
    "use server";
    await deleteQuoteRecord(quote!.id);
  }

  async function handleGenerateContract() {
    "use server";
    await generateContractFromQuote(quote!.id);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <div>
          <Link
            href={backHref}
            className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
          >
            {backLabel}
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-2xl font-semibold text-brand-dark">{quote.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {contract ? (
            <Link
              href={`/dashboard/contracts/${contract.id}`}
              className="bg-brand-light text-brand-dark text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-mid hover:text-white transition-colors"
            >
              View Contract
            </Link>
          ) : (
            <form action={handleGenerateContract}>
              <button
                type="submit"
                className="bg-brand-light text-brand-dark text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-mid hover:text-white transition-colors"
              >
                Generate Contract
              </button>
            </form>
          )}
          <Link
            href={`/dashboard/quotes/${quote.id}/edit`}
            className="bg-brand-mid text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            Edit
          </Link>
          <form action={handleDelete}>
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors px-2 py-2"
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {/* Document */}
      <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden max-w-4xl">
        {/* Doc header */}
        <div className="px-9 pt-7 pb-5 flex items-start justify-between gap-5 border-b-[2.5px] border-brand-dark">
          <div className="flex items-center">
            <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-24 w-auto" priority />
          </div>
          <div className="text-right">
            <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">Cost Estimate</p>
            <div className="flex flex-col gap-0.5 text-[11.5px] text-gray-500">
              <p>
                <span className="font-medium">Quote #:</span>{" "}
                <span className="text-brand-dark font-mono">{quoteNumber(quote.id, quote.created_at)}</span>
              </p>
              <p>
                <span className="font-medium">Date:</span>{" "}
                <span className="text-brand-dark">{fmtDate(quote.issued_date)}</span>
              </p>
              <p>
                <span className="font-medium">Valid for:</span>{" "}
                <span className="text-brand-dark">{quote.valid_for || "30 days"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="px-9 pt-6 pb-8">
          {/* Client / Project info */}
          <div className="grid grid-cols-2 gap-3.5 mb-7">
            <div className="bg-brand-cream border border-brand-light rounded-lg px-4 py-3.5">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark mb-2.5">Client</p>
              <InfoField label="Name" value={quote.clients?.name} />
              <InfoField label="Company" value={quote.clients?.company} />
              <InfoField label="Email" value={quote.clients?.email} />
              <InfoField label="Phone" value={quote.clients?.phone} />
            </div>
            <div className="bg-brand-cream border border-brand-light rounded-lg px-4 py-3.5">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark mb-2.5">Project</p>
              <InfoField label="Project" value={quote.project_name} />
              <InfoField label="Scope" value={quote.scope} />
              <InfoField label="Timeline" value={quote.timeline} />
              <InfoField label="Prepared By" value={quote.prepared_by} />
            </div>
          </div>

          <div className="space-y-7">
            <LineItemSection
              num={1}
              title="Build Phase"
              items={buildItems}
              subtotalLabel="Total Build Cost"
              subtotal={quote.build_total ?? 0}
            />
            <LineItemSection
              num={2}
              title="Annual Maintenance"
              items={maintItems}
              subtotalLabel="Monthly Rate (billed annually)"
              subtotal={quote.monthly_retainer ?? 0}
            />
          </div>

          {/* Grand totals */}
          {(() => {
            const annual = annualValue(quote.monthly_retainer);
            const contractTotal = (quote.build_total ?? 0) + annual;
            const deposit = contractTotal / 2;
            return (
              <div className="mt-7 space-y-3 max-w-2xl ml-auto">
                {/* Breakdown */}
                <div className="bg-brand-light/40 rounded-lg border border-brand-light divide-y divide-brand-light overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Build Total</span>
                    <span className="text-sm font-medium text-brand-dark">{fmtMoney(quote.build_total)}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      Annual Maintenance <span className="normal-case font-normal">({fmtMoney(quote.monthly_retainer)}/mo × 12)</span>
                    </span>
                    <span className="text-sm font-medium text-brand-dark">{fmtMoney(annual)}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 bg-brand-dark/5">
                    <span className="text-sm font-bold text-brand-dark uppercase tracking-wide">Total Contract Value</span>
                    <span className="text-xl font-bold text-brand-dark">{fmtMoney(contractTotal)}</span>
                  </div>
                </div>
                {/* Payment schedule */}
                <div className="bg-brand-cream rounded-lg border border-brand-light divide-y divide-brand-light overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <span className="text-xs font-semibold text-brand-dark">Invoice 1 — Deposit</span>
                      <span className="text-[10px] text-gray-400 ml-2">Due upon contract signing</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-dark">{fmtMoney(deposit)}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <span className="text-xs font-semibold text-brand-dark">Invoice 2 — Final Payment</span>
                      <span className="text-[10px] text-gray-400 ml-2">Due upon delivery &amp; acceptance</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-dark">{fmtMoney(deposit)}</span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-2.5">
                    <div>
                      <span className="text-xs font-semibold text-brand-dark">Annual Renewal</span>
                      <span className="text-[10px] text-gray-400 ml-2">Due on renewal date each year</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-dark">{fmtMoney(annual)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Notes / Payment terms */}
          <div className="mt-7">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-2">Payment Terms &amp; Notes</p>
            <ul className="space-y-1.5">
              {[
                `A 50% deposit of ${fmtMoney((((quote.build_total ?? 0) + annualValue(quote.monthly_retainer)) / 2))} is due upon contract signing to begin work.`,
                `The remaining 50% of ${fmtMoney((((quote.build_total ?? 0) + annualValue(quote.monthly_retainer)) / 2))} is due upon final delivery and client acceptance.`,
                `Annual maintenance renews at ${fmtMoney(annualValue(quote.monthly_retainer))}/year on the renewal date. Cancellation prior to renewal is prorated for unused months.`,
                "Scope changes or additional features will be quoted separately via written change order.",
                `This quote is valid for ${quote.valid_for || "30 days"} from the date issued. All prices are in USD.`,
              ].map((note) => (
                <li key={note} className="text-xs text-gray-500 flex gap-2">
                  <span className="text-brand-mid font-bold flex-shrink-0">•</span>
                  {note}
                </li>
              ))}
            </ul>
            {quote.notes && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-1">Internal Notes</p>
                <p className="text-sm text-brand-dark whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
          Rooted Tech Solutions · rootedtechsolutions.com
        </div>
      </div>
    </div>
  );
}
