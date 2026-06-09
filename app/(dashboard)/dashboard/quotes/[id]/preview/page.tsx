import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { annualValue, fmtMoney, quoteNumber } from "../../lineItems";
import { contractClauses, type ContractSnapshot } from "../../../contracts/contractTerms";
import PrintButton from "@/components/ui/PrintButton";
import CopyButton from "@/components/ui/CopyButton";
import type { LineItem } from "../../actions";
import type { SowItem } from "../../../scope/actions";

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
    <div className="grid grid-cols-[88px_1fr] items-baseline gap-x-2.5 mb-0.5">
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
  annualTotal,
}: {
  num: number;
  title: string;
  items: LineItem[];
  subtotalLabel: string;
  subtotal: number;
  annualTotal?: number;
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
            {items.map((item, i) => (
              <tr key={i} className="border-t border-brand-light">
                <td className="px-3 py-2 text-gray-400 font-mono text-xs">{item.num}</td>
                <td className="px-3 py-2 text-brand-dark">{item.desc}</td>
                <td className="px-3 py-2 text-right text-gray-600">{item.hours || 0}</td>
                <td className="px-3 py-2 text-right text-gray-600">{fmtMoney(item.rate)}</td>
                <td className="px-3 py-2 text-right font-medium text-brand-dark">{fmtMoney((item.hours || 0) * (item.rate || 0))}</td>
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
            {annualTotal !== undefined && (
              <tr className="border-t border-brand-light/60 bg-brand-cream/60">
                <td colSpan={4} className="px-3 py-1.5 text-right text-[10px] text-gray-500 italic">Annual total (×12)</td>
                <td className="px-3 py-1.5 text-right text-[10px] font-medium text-brand-mid">{fmtMoney(annualTotal)}/yr</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default async function QuotePreviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, clients(id, name, company, email, phone)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!quote) notFound();

  const [{ data: contract }, { data: sow }] = await Promise.all([
    supabase
      .from("contracts")
      .select("*")
      .eq("quote_id", quote.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Most recent SOW linked to this client
    quote.clients?.id
      ? supabase
          .from("scope_of_work")
          .select("*")
          .eq("user_id", user.id)
          .eq("client_id", (quote.clients as { id: string }).id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const buildItems: LineItem[] = quote.build_items ?? [];
  const maintItems: LineItem[] = quote.maintenance_items ?? [];
  const annual = annualValue(quote.monthly_retainer);
  const contractTotal = (quote.build_total ?? 0) + annual;
  const deposit = contractTotal / 2;

  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3003";
  const proto = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const signLink = contract ? `${proto}://${host}/sign/${contract.sign_token}` : null;
  const snapshot = contract?.snapshot as ContractSnapshot | undefined;
  const clauses = snapshot ? contractClauses(snapshot) : [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Action bar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-brand-light px-8 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/quotes/${quote.id}`} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
            ← Back to Quote
          </Link>
          <span className="text-gray-300">|</span>
          <p className="text-sm font-semibold text-brand-dark">Client Package Preview</p>
        </div>
        <div className="flex items-center gap-3">
          {signLink && (
            <div className="flex items-center gap-2 bg-brand-cream border border-brand-light rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-500">Signing link:</span>
              <code className="text-xs font-mono text-brand-dark max-w-[280px] truncate">{signLink}</code>
              <CopyButton text={signLink} label="Copy" />
            </div>
          )}
          <PrintButton label="Save as PDF" />
        </div>
      </div>

      {/* Tip banner — hidden on print */}
      <div className="print:hidden max-w-4xl mx-auto mt-6 px-8">
        <div className="bg-brand-dark/5 border border-brand-light rounded-xl px-5 py-3.5 flex items-start gap-3">
          <svg className="w-4 h-4 text-brand-mid mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-brand-dark/80 leading-relaxed">
            <strong className="font-semibold">How to send this to your client:</strong>{" "}
            Click <strong>Save as PDF</strong> → your browser&apos;s print dialog opens → choose <em>Save as PDF</em> as the destination.
            This package includes all three documents in order: <strong>Quote → Scope of Work → Service Agreement</strong>.
            Email the PDF to your client. The signing link{signLink ? " (shown above and in the contract section below)" : " will appear here once you generate a contract and mark it Sent"} is embedded in the agreement — the client clicks it to sign electronically.
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-10">

        {/* ── DOCUMENT 1: QUOTE ── */}
        <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Doc header */}
          <div className="px-9 pt-7 pb-5 flex items-start justify-between gap-5 border-b-[2.5px] border-brand-dark">
            <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-20 w-auto" priority />
            <div className="text-right">
              <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">Cost Estimate</p>
              <div className="flex flex-col gap-0.5 text-[11.5px] text-gray-500">
                <p><span className="font-medium">Quote #:</span> <span className="text-brand-dark font-mono">{quoteNumber(quote.id, quote.created_at)}</span></p>
                <p><span className="font-medium">Date:</span> <span className="text-brand-dark">{fmtDate(quote.issued_date)}</span></p>
                <p><span className="font-medium">Expires:</span> <span className="text-brand-dark">{fmtDate(quote.expiry_date)}</span></p>
              </div>
            </div>
          </div>

          <div className="px-9 pt-6 pb-8">
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
              <LineItemSection num={1} title="Build Phase" items={buildItems} subtotalLabel="Total Build Cost" subtotal={quote.build_total ?? 0} />
              <LineItemSection num={2} title="Annual Maintenance" items={maintItems} subtotalLabel="Monthly Rate" subtotal={quote.monthly_retainer ?? 0} annualTotal={annual} />
            </div>

            {/* Grand totals */}
            <div className="mt-7 space-y-3 max-w-2xl ml-auto">
              <div className="bg-brand-light/40 rounded-lg border border-brand-light divide-y divide-brand-light overflow-hidden">
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Build Total</span>
                  <span className="text-sm font-medium text-brand-dark">{fmtMoney(quote.build_total)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Annual Maintenance <span className="normal-case font-normal">({fmtMoney(quote.monthly_retainer)}/mo × 12)</span></span>
                  <span className="text-sm font-medium text-brand-dark">{fmtMoney(annual)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3 bg-brand-dark/5">
                  <span className="text-sm font-bold text-brand-dark uppercase tracking-wide">Total Contract Value</span>
                  <span className="text-xl font-bold text-brand-dark">{fmtMoney(contractTotal)}</span>
                </div>
              </div>
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

            <div className="mt-7">
              <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-2">Payment Terms &amp; Notes</p>
              <ul className="space-y-1.5">
                {[
                  `A 50% deposit of ${fmtMoney(deposit)} is due upon contract signing to begin work.`,
                  `The remaining 50% of ${fmtMoney(deposit)} is due upon final delivery and client acceptance.`,
                  `Annual maintenance renews at ${fmtMoney(annual)}/year. Cancellation is prorated for unused months.`,
                  "Scope changes will be quoted separately via written change order.",
                  `This quote is valid until ${fmtDate(quote.expiry_date)}. All prices are in USD.`,
                ].map((note) => (
                  <li key={note} className="text-xs text-gray-500 flex gap-2">
                    <span className="text-brand-mid font-bold flex-shrink-0">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
            Rooted Tech Solutions · rootedtechsolutions.com
          </div>
        </div>

        {/* ── DOCUMENT 2: SCOPE OF WORK ── */}
        {sow ? (
          <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-9 pt-7 pb-5 flex items-start justify-between gap-5 border-b-[2.5px] border-brand-dark">
              <div>
                <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">Scope of Work</p>
                <p className="text-sm text-gray-500">
                  {(quote.clients as { company?: string | null; name?: string | null } | null)?.company ||
                    (quote.clients as { company?: string | null; name?: string | null } | null)?.name ||
                    "Client"}
                  {sow.title ? ` — ${sow.title}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Image src="/logo.png" alt="Rooted Tech Solutions" width={200} height={92} className="h-16 w-auto" />
                <div className="text-right text-[11px] text-gray-500 space-y-0.5 mt-1">
                  <p><span className="font-medium">Document:</span> <span className="font-mono text-brand-dark">{sow.sow_number}</span></p>
                  <p><span className="font-medium">Date:</span> <span className="text-brand-dark">{fmtDate(sow.issued_date)}</span></p>
                </div>
              </div>
            </div>

            <div className="px-9 pt-6 pb-8 space-y-7">
              {sow.notes && (
                <div>
                  <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">Project Overview &amp; Discovery Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{sow.notes}</p>
                </div>
              )}

              {((sow.deliverables ?? []) as SowItem[]).length > 0 && (
                <div>
                  <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">Deliverables — What Is Included</p>
                  <ul className="space-y-1.5">
                    {((sow.deliverables ?? []) as SowItem[]).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-brand-mid font-bold mt-0.5 flex-shrink-0">•</span>{item.item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {((sow.exclusions ?? []) as SowItem[]).length > 0 && (
                <div>
                  <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">Exclusions — What Is NOT Included</p>
                  <ul className="space-y-1.5">
                    {((sow.exclusions ?? []) as SowItem[]).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-brand-mid font-bold mt-0.5 flex-shrink-0">•</span>{item.item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {((sow.assumptions ?? []) as SowItem[]).length > 0 && (
                <div>
                  <p className="text-sm font-bold text-brand-dark mb-2 pb-1 border-b border-brand-light">Assumptions &amp; Client Responsibilities</p>
                  <ul className="space-y-1.5">
                    {((sow.assumptions ?? []) as SowItem[]).map((item, i) => (
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
                  Any work requested outside the deliverables listed above — or beyond the allocated monthly hours defined in the accompanying service agreement — is considered a scope change. Scope changes will be assessed, quoted in writing, and require written approval before work begins. Rooted Tech Solutions will not perform out-of-scope work without a signed change order.
                </p>
              </div>
            </div>

            <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
              Rooted Tech Solutions · rootedtechsolutions.com
            </div>
          </div>
        ) : (
          <div className="print:hidden bg-white rounded-xl border-2 border-dashed border-brand-light p-8 text-center">
            <p className="text-sm font-medium text-gray-500">No Scope of Work document yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-3">Create one from the client page to include it in this package.</p>
            {quote.clients && (
              <Link href={`/dashboard/scope/new?client_id=${(quote.clients as { id: string }).id}&from=/dashboard/quotes/${quote.id}/preview`} className="text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors">
                + Create SOW →
              </Link>
            )}
          </div>
        )}

        {/* ── DOCUMENT 3: CONTRACT ── */}
        {contract && snapshot ? (
          <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.10),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-9 pt-7 pb-5 border-b-[2.5px] border-brand-dark flex items-start justify-between gap-5">
              <div>
                <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">Service Agreement</p>
                <p className="text-sm text-gray-500">
                  Between Rooted Tech Solutions and {snapshot.client_company || snapshot.client_name || "Client"}
                  {snapshot.project_name ? ` — ${snapshot.project_name}` : ""}
                </p>
              </div>
              <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-16 w-auto" />
            </div>

            <div className="px-9 pt-6 pb-8">
              <div className="space-y-5">
                {clauses.map((clause) => (
                  <div key={clause.title}>
                    <p className="text-sm font-bold text-brand-dark mb-1">{clause.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{clause.body}</p>
                  </div>
                ))}
              </div>

              {/* Signature section — below the terms */}
              <div className="mt-8 pt-6 border-t-[1.5px] border-brand-light">
                {contract.status === "signed" ? (
                  <div>
                    <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-3">Electronically Signed</p>
                    <p className="text-2xl text-brand-dark mb-1" style={{ fontFamily: "cursive" }}>{contract.signed_name}</p>
                    <p className="text-xs text-gray-400">
                      {contract.signed_at ? new Date(contract.signed_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }) : ""}
                    </p>
                  </div>
                ) : signLink ? (
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      By clicking the button below, you confirm that you have read and agree to all terms outlined in this service agreement and the accompanying quote. Your electronic signature has the same legal effect as a handwritten signature under the E-SIGN Act.
                    </p>
                    <a
                      href={signLink}
                      className="inline-flex items-center gap-2 bg-brand-dark text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-brand-mid transition-colors shadow-md shadow-brand-dark/20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Agree &amp; Sign Electronically
                    </a>
                    <p className="text-[10px] text-gray-400">
                      You will be directed to a secure signing page to enter your name and confirm your agreement.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
              Rooted Tech Solutions · rootedtechsolutions.com
            </div>
          </div>
        ) : (
          <div className="print:hidden bg-white rounded-xl border-2 border-dashed border-brand-light p-10 text-center">
            <p className="text-sm font-medium text-gray-500">No contract generated yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Generate a contract from the quote page, mark it as Sent, then come back here.</p>
            <Link
              href={`/dashboard/quotes/${quote.id}`}
              className="text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors"
            >
              ← Back to quote to generate contract
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
