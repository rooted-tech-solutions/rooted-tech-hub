import Image from "next/image";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/ui/PrintButton";
import { quoteNumber } from "@/app/(dashboard)/dashboard/quotes/lineItems";
import QuoteSummary from "@/app/(dashboard)/dashboard/quotes/QuoteSummary";
import { InfoCard, InfoField, QuoteTotals, ScopeBlock } from "@/app/(dashboard)/dashboard/quotes/QuoteDocument";
import { maintenanceOfSnapshot } from "@/app/(dashboard)/dashboard/quotes/maintenance";
import {
  contractClauses,
  isLegacyCarePlan,
  scopeChangePolicy,
  type ContractSnapshot,
} from "@/app/(dashboard)/dashboard/contracts/contractTerms";
import type { LineItem } from "@/app/(dashboard)/dashboard/quotes/actions";
import type { SowItem } from "@/app/(dashboard)/dashboard/scope/actions";
import SignatureForm from "./SignatureForm";
import { submitSignature } from "./actions";

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Each document is a white sheet. On a phone the sheet runs nearly edge to
// edge with tighter padding; from `sm` (and in print) it has its full margins.
const sheet = "overflow-hidden rounded-xl bg-white shadow-[0_4px_32px_rgba(0,0,0,0.08)]";
const sheetHead = "flex gap-4 border-b-[2.5px] border-brand-dark px-5 pb-5 pt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-9 sm:pt-7";
const sheetBody = "px-5 pb-8 pt-6 sm:px-9";
const sheetFoot = "border-t border-brand-light bg-brand-cream px-5 py-4 text-center text-xs text-gray-400 sm:px-8";
const docTitle = "mb-1.5 text-lg font-bold uppercase tracking-wide text-brand-brown sm:text-[20px]";

export default async function SignContractPage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data: rows } = await supabase.rpc("get_client_package_by_token", { p_token: params.token });

  // Note that the client opened the link (migration 010). Best-effort: the
  // page must render even if the function is not there yet.
  const openedFrom = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || headers().get("x-real-ip") || "unknown";
  await supabase.rpc("record_package_opened", { p_token: params.token, p_ip: openedFrom }).then(
    () => undefined,
    () => undefined,
  );
  const row = rows?.[0];

  if (!row) notFound();

  const contract = row;
  const snapshot = contract.snapshot as ContractSnapshot;
  const clauses = contractClauses(snapshot);
  const quote = contract.quote_row as (Record<string, unknown> & {
    id: string; title: string; issued_date: string | null; expiry_date: string | null;
    project_name: string | null; scope: string | null; timeline: string | null; prepared_by: string | null;
    build_items: LineItem[]; maintenance_items: LineItem[];
    build_total: number | null; monthly_retainer: number | null;
    clients: { name: string | null; company: string | null; email: string | null; phone: string | null } | null;
  }) | null;
  const sow = contract.sow_row as (Record<string, unknown> & {
    id: string; sow_number: string; title: string | null; issued_date: string | null;
    notes: string | null; deliverables: SowItem[]; exclusions: SowItem[]; assumptions: SowItem[];
  }) | null;

  const buildItems: LineItem[] = quote?.build_items ?? [];
  // Prices come from the agreement's frozen snapshot, so the quote section
  // always matches the contract the client is signing.
  const maintenance = maintenanceOfSnapshot(snapshot);
  const buildTotal = snapshot.build_total ?? quote?.build_total ?? 0;

  async function action(prevState: { error?: string; success?: boolean } | null, formData: FormData) {
    "use server";
    return submitSignature(params.token, prevState, formData);
  }

  return (
    <div className="min-h-screen bg-gray-100 px-3 py-5 sm:px-4 sm:py-10">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between gap-3 sm:mb-8 print:hidden">
          <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-10 w-auto sm:h-14" priority />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide">Client Package</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {snapshot.client_company || snapshot.client_name || "Client"}
                {snapshot.project_name ? ` — ${snapshot.project_name}` : ""}
              </p>
            </div>
            <PrintButton label="Download PDF" />
          </div>
        </div>

        <div className="space-y-5 sm:space-y-8">

          {/* ── DOCUMENT 1: QUOTE ── */}
          {quote && (
            <div className={sheet}>
              <div className={`${sheetHead} flex-col`}>
                <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-14 w-auto self-start sm:h-20" />
                <div className="sm:text-right">
                  <p className={docTitle}>Cost Estimate</p>
                  <div className="flex flex-col gap-0.5 text-[11.5px] text-gray-500">
                    <p><span className="font-medium">Quote #:</span> <span className="text-brand-dark font-mono">{quoteNumber(quote.id, quote.issued_date)}</span></p>
                    <p><span className="font-medium">Date:</span> <span className="text-brand-dark">{fmtDate(quote.issued_date)}</span></p>
                    <p><span className="font-medium">Expires:</span> <span className="text-brand-dark">{fmtDate(quote.expiry_date)}</span></p>
                  </div>
                </div>
              </div>

              <div className={sheetBody}>
                {/* Client / Project */}
                <div className="mb-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <InfoCard title="Client">
                    <InfoField label="Name" value={snapshot.client_name} />
                    <InfoField label="Company" value={snapshot.client_company} />
                  </InfoCard>
                  <InfoCard title="Project">
                    <InfoField label="Project" value={quote.project_name} />
                    <InfoField label="Timeline" value={quote.timeline} />
                  </InfoCard>
                  <ScopeBlock scope={quote.scope} />
                </div>

                {/* What is being quoted — the phases and Maintenance & Hosting, never the pricing worksheet. */}
                <div className="mb-7">
                  <QuoteSummary buildItems={buildItems} buildTotal={buildTotal} maintenance={maintenance} />
                </div>

                {/* Totals */}
                <QuoteTotals buildTotal={buildTotal} annual={maintenance.annual} />
              </div>
              <div className={sheetFoot}>
                Rooted Tech Solutions · rootedtechsolutions.com
              </div>
            </div>
          )}

          {/* ── DOCUMENT 2: SOW ── */}
          {sow && (
            <div className={sheet}>
              <div className={`${sheetHead} flex-col-reverse sm:flex-row`}>
                <div className="min-w-0">
                  <p className={docTitle}>Scope of Work</p>
                  <p className="text-sm text-gray-500">
                    {snapshot.client_company || snapshot.client_name || "Client"}
                    {sow.title ? ` — ${sow.title}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <Image src="/logo.png" alt="Rooted Tech Solutions" width={200} height={92} className="h-12 w-auto sm:h-16" />
                  <div className="mt-1 space-y-0.5 text-[11px] text-gray-500 sm:text-right">
                    <p><span className="font-medium">Document:</span> <span className="font-mono text-brand-dark">{sow.sow_number}</span></p>
                    <p><span className="font-medium">Date:</span> <span className="text-brand-dark">{fmtDate(sow.issued_date)}</span></p>
                  </div>
                </div>
              </div>
              <div className={`${sheetBody} space-y-7`}>
                {sow.notes && (
                  <div>
                    <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">Project Overview &amp; Discovery Notes</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{sow.notes}</p>
                  </div>
                )}
                {(sow.deliverables ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">Deliverables — What Is Included</p>
                    <ul className="space-y-1.5">
                      {(sow.deliverables ?? []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-brand-mid font-bold mt-0.5 flex-shrink-0">•</span>{item.item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(sow.exclusions ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">Exclusions — What Is NOT Included</p>
                    <ul className="space-y-1.5">
                      {(sow.exclusions ?? []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-brand-mid font-bold mt-0.5 flex-shrink-0">•</span>{item.item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(sow.assumptions ?? []).length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">Assumptions &amp; Client Responsibilities</p>
                    <ul className="space-y-1.5">
                      {(sow.assumptions ?? []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-brand-mid font-bold mt-0.5 flex-shrink-0">•</span>{item.item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="bg-brand-cream border border-brand-light rounded-lg px-5 py-4">
                  <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-1.5">Scope Change Policy</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {scopeChangePolicy(isLegacyCarePlan(snapshot) && (snapshot.monthly_hours ?? 0) > 0)}
                  </p>
                </div>
              </div>
              <div className={sheetFoot}>
                Rooted Tech Solutions · rootedtechsolutions.com
              </div>
            </div>
          )}

          {/* ── DOCUMENT 3: CONTRACT + SIGNATURE ── */}
          <div className={sheet}>
            <div className={`${sheetHead} flex-col-reverse sm:flex-row`}>
              <div className="min-w-0">
                <p className={docTitle}>Service Agreement</p>
                <p className="text-sm text-gray-500">
                  Between Rooted Tech Solutions and {snapshot.client_company || snapshot.client_name || "Client"}
                  {snapshot.project_name ? ` — ${snapshot.project_name}` : ""}
                </p>
              </div>
              <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-12 w-auto self-start sm:h-16" />
            </div>
            <div className={sheetBody}>
              <div className="space-y-5">
                {clauses.map((clause) => (
                  <div key={clause.title}>
                    <p className="text-sm font-bold text-brand-dark mb-1">{clause.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{clause.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t-[1.5px] border-brand-light">
                {contract.contract_status === "signed" ? (
                  <div>
                    <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-3">Electronically Signed</p>
                    <p className="text-2xl text-brand-dark mb-1 break-words" style={{ fontFamily: "cursive" }}>{contract.signer_name}</p>
                    <p className="text-xs text-gray-400">{fmtDateTime(contract.signed_at)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-stretch gap-3 sm:items-start print:hidden">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      By clicking the button below, you confirm that you have read and agree to all terms outlined in this service agreement and the accompanying quote. Your electronic signature has the same legal effect as a handwritten signature under the E-SIGN Act.
                    </p>
                    <SignatureForm action={action} />
                  </div>
                )}
              </div>
            </div>
            <div className={sheetFoot}>
              Rooted Tech Solutions · rootedtechsolutions.com
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-8 mb-4 print:hidden">Rooted Tech Solutions · rootedtechsolutions.com</p>
      </div>
    </div>
  );
}
