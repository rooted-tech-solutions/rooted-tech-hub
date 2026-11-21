import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { StatusBadge } from "../statusBadge";
import { backLink } from "../../backLink";
import QuoteSummary, { MaintenanceSection } from "../QuoteSummary";
import { InfoCard, InfoField, QuoteTotals, ScopeBlock, paymentNotes } from "../QuoteDocument";
import { MAINTENANCE_LABEL, maintenanceOf } from "../maintenance";
import { deleteQuoteRecord, updateQuoteStatus } from "../actions";
import { generateContractFromQuote } from "../../contracts/actions";
import { fmtMoney, quoteNumber } from "../lineItems";
import type { LineItem } from "../actions";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; view?: string };
}) {
  // The client-facing document is the phase summary. The itemized hours × rate
  // table is the pricing worksheet — one toggle away, never the default.
  const itemized = searchParams.view === "itemized";
  const toggleParams = new URLSearchParams();
  if (searchParams.from) toggleParams.set("from", searchParams.from);
  if (!itemized) toggleParams.set("view", "itemized");
  const toggleHref = `/dashboard/quotes/${params.id}${toggleParams.size ? `?${toggleParams}` : ""}`;
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

  const { href: backHref, label: backLabel } = backLink(searchParams.from, quote.client_id, { href: "/dashboard/quotes", label: "Quotes" });
  const here = `/dashboard/quotes/${quote.id}`;

  const buildItems: LineItem[] = quote.build_items ?? [];
  const maintenance = maintenanceOf(quote);

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

  async function handleStatus(formData: FormData) {
    "use server";
    await updateQuoteStatus(quote!.id, String(formData.get("status") ?? ""), quote!.client_id ?? undefined);
  }

  const stamps = [
    ["Sent", quote.sent_at as string | null | undefined],
    ["Accepted", quote.accepted_at as string | null | undefined],
    ["Declined", quote.declined_at as string | null | undefined],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k} ${new Date(v as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
  const statusButton =
    "whitespace-nowrap bg-brand-light text-brand-dark text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-mid hover:text-white transition-colors";

  return (
    <div className="p-4 md:p-8">
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
            <StatusBadge status={quote.status} />
          </div>
          {stamps.length > 0 && <p className="mt-1 text-xs text-gray-400">{stamps.join(" · ")}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={toggleHref}
            className="whitespace-nowrap text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors px-2 py-2"
          >
            {itemized ? "Show summary" : "Show line items"}
          </Link>
          {quote.status === "draft" && (
            <form action={handleStatus}>
              <input type="hidden" name="status" value="sent" />
              <button type="submit" className={statusButton}>Mark sent</button>
            </form>
          )}
          {quote.status === "sent" && (
            <>
              <form action={handleStatus}>
                <input type="hidden" name="status" value="accepted" />
                <button type="submit" className={statusButton}>Accepted</button>
              </form>
              <form action={handleStatus}>
                <input type="hidden" name="status" value="declined" />
                <button type="submit" className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors px-2 py-2">Declined</button>
              </form>
            </>
          )}
          {contract ? (
            <Link
              href={`/dashboard/contracts/${contract.id}?from=${encodeURIComponent(here)}`}
              className="whitespace-nowrap bg-brand-light text-brand-dark text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-mid hover:text-white transition-colors"
            >
              View Contract
            </Link>
          ) : (
            <form action={handleGenerateContract}>
              <button
                type="submit"
                className="whitespace-nowrap bg-brand-light text-brand-dark text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-mid hover:text-white transition-colors"
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
            <ConfirmButton label="Delete" disabled={Boolean(contract)} disabledReason="Delete its contract first." />
          </form>
        </div>
      </div>

      {/* Document */}
      <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden max-w-4xl">
        {/* Doc header */}
        <div className="flex flex-col gap-4 border-b-[2.5px] border-brand-dark px-5 pb-5 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-9 sm:pt-7">
          <div className="flex items-center">
            <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-16 w-auto sm:h-24" priority />
          </div>
          <div className="sm:text-right">
            <p className="text-lg sm:text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">
              {quote.kind === "change_order" ? "Change Order" : "Cost Estimate"}
            </p>
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

        <div className="px-5 pb-8 pt-6 sm:px-9">
          {/* Client / Project info */}
          <div className="mb-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <InfoCard title="Client">
              <InfoField label="Name" value={quote.clients?.name} />
              <InfoField label="Company" value={quote.clients?.company} />
              <InfoField label="Email" value={quote.clients?.email} />
              <InfoField label="Phone" value={quote.clients?.phone} />
            </InfoCard>
            <InfoCard title="Project">
              <InfoField label="Project" value={quote.project_name} />
              <InfoField label="Timeline" value={quote.timeline} />
              <InfoField label="Prepared By" value={quote.prepared_by} />
            </InfoCard>
            <ScopeBlock scope={quote.scope} />
          </div>

          {itemized ? (
            <div className="space-y-7">
              <LineItemSection
                num={1}
                title="Build Phase"
                items={buildItems}
                subtotalLabel="Total Build Cost"
                subtotal={quote.build_total ?? 0}
              />
              {quote.kind !== "change_order" && <MaintenanceSection maintenance={maintenance} />}
            </div>
          ) : (
            <QuoteSummary
              buildItems={buildItems}
              buildTotal={quote.build_total}
              maintenance={quote.kind === "change_order" ? { annual: 0, description: "", lines: [] } : maintenance}
            />
          )}

          {/* Grand totals — a change order is one number, billed on acceptance */}
          {quote.kind === "change_order" ? (
            <div className="mt-7 max-w-2xl ml-auto">
              <div className="flex items-center justify-between rounded-lg border border-brand-light bg-brand-dark/5 px-5 py-3">
                <span className="text-sm font-bold uppercase tracking-wide text-brand-dark">Change Order Total</span>
                <span className="text-xl font-bold text-brand-dark">{fmtMoney(quote.build_total)}</span>
              </div>
              <p className="mt-2 text-right text-[11px] text-gray-500">Billed separately from the original agreement, on acceptance.</p>
            </div>
          ) : (
            <div className="mt-7">
              <QuoteTotals buildTotal={quote.build_total} annual={maintenance.annual} />
            </div>
          )}

          {/* Notes / Payment terms */}
          <div className="mt-7">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-2">Payment Terms &amp; Notes</p>
            <ul className="space-y-1.5">
              {(quote.kind === "change_order"
                ? [
                    "This change order covers work outside the signed agreement and is billed separately, on acceptance.",
                    `It does not change ${MAINTENANCE_LABEL} or the payment schedule already agreed.`,
                    "All prices are in USD.",
                  ]
                : paymentNotes({
                    buildTotal: quote.build_total,
                    annual: maintenance.annual,
                    validity: `This quote is valid for ${quote.valid_for || "30 days"} from the date issued. All prices are in USD.`,
                  })
              ).map((note) => (
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
