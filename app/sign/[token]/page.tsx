import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { annualValue, fmtMoney, quoteNumber } from "@/app/(dashboard)/dashboard/quotes/lineItems";
import { contractClauses, type ContractSnapshot } from "@/app/(dashboard)/dashboard/contracts/contractTerms";
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

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-baseline gap-x-2.5 mb-0.5">
      <span className="text-[10.5px] font-semibold text-brand-dark whitespace-nowrap">{label}</span>
      <span className="text-[11px] text-brand-dark border-b border-dashed border-brand-light pb-0.5">{value || "—"}</span>
    </div>
  );
}

function DocDivider({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-dark text-white text-xs font-bold flex-shrink-0">{num}</span>
      <span className="text-sm font-bold text-brand-dark uppercase tracking-wide">{title}</span>
      <div className="flex-1 h-px bg-brand-light" />
    </div>
  );
}

export default async function SignContractPage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data: rows } = await supabase.rpc("get_client_package_by_token", { p_token: params.token });
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
  const maintItems: LineItem[] = quote?.maintenance_items ?? [];
  const annual = annualValue(quote?.monthly_retainer);
  const contractTotal = (quote?.build_total ?? 0) + annual;
  const deposit = contractTotal / 2;

  async function action(prevState: { error?: string; success?: boolean } | null, formData: FormData) {
    "use server";
    return submitSignature(params.token, prevState, formData);
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-14 w-auto" priority />
          <div className="text-right">
            <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide">Client Package</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {snapshot.client_company || snapshot.client_name || "Client"}
              {snapshot.project_name ? ` — ${snapshot.project_name}` : ""}
            </p>
          </div>
        </div>

        <div className="space-y-8">

          {/* ── DOCUMENT 1: QUOTE ── */}
          {quote && (
            <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-9 pt-7 pb-5 flex items-start justify-between gap-5 border-b-[2.5px] border-brand-dark">
                <Image src="/logo.png" alt="Rooted Tech Solutions" width={300} height={138} className="h-20 w-auto" />
                <div className="text-right">
                  <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">Cost Estimate</p>
                  <div className="flex flex-col gap-0.5 text-[11.5px] text-gray-500">
                    <p><span className="font-medium">Quote #:</span> <span className="text-brand-dark font-mono">{quoteNumber(quote.id, quote.issued_date)}</span></p>
                    <p><span className="font-medium">Date:</span> <span className="text-brand-dark">{fmtDate(quote.issued_date)}</span></p>
                    <p><span className="font-medium">Expires:</span> <span className="text-brand-dark">{fmtDate(quote.expiry_date)}</span></p>
                  </div>
                </div>
              </div>

              <div className="px-9 pt-6 pb-8">
                {/* Client / Project */}
                <div className="grid grid-cols-2 gap-3.5 mb-7">
                  <div className="bg-brand-cream border border-brand-light rounded-lg px-4 py-3.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark mb-2.5">Client</p>
                    <InfoField label="Name" value={snapshot.client_name} />
                    <InfoField label="Company" value={snapshot.client_company} />
                  </div>
                  <div className="bg-brand-cream border border-brand-light rounded-lg px-4 py-3.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-brand-dark mb-2.5">Project</p>
                    <InfoField label="Project" value={quote.project_name} />
                    <InfoField label="Scope" value={quote.scope} />
                    <InfoField label="Timeline" value={quote.timeline} />
                  </div>
                </div>

                {/* Build line items */}
                {buildItems.length > 0 && (
                  <div className="mb-7">
                    <DocDivider num={1} title="Build Phase" />
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
                          {buildItems.map((item, i) => (
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
                            <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brand-dark">Total Build Cost</td>
                            <td className="px-3 py-2 text-right font-semibold text-brand-dark">{fmtMoney(quote.build_total)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Maintenance line items */}
                {maintItems.length > 0 && (
                  <div className="mb-7">
                    <DocDivider num={2} title="Annual Maintenance" />
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
                          {maintItems.map((item, i) => (
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
                            <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brand-dark">Monthly Rate</td>
                            <td className="px-3 py-2 text-right font-semibold text-brand-dark">{fmtMoney(quote.monthly_retainer)}</td>
                          </tr>
                          <tr className="border-t border-brand-light/60 bg-brand-cream/60">
                            <td colSpan={4} className="px-3 py-1.5 text-right text-[10px] text-gray-500 italic">Annual total (×12)</td>
                            <td className="px-3 py-1.5 text-right text-[10px] font-medium text-brand-mid">{fmtMoney(annual)}/yr</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-3 max-w-2xl ml-auto">
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
                      <div><span className="text-xs font-semibold text-brand-dark">Invoice 1 — Deposit</span><span className="text-[10px] text-gray-400 ml-2">Due upon contract signing</span></div>
                      <span className="text-sm font-semibold text-brand-dark">{fmtMoney(deposit)}</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-2.5">
                      <div><span className="text-xs font-semibold text-brand-dark">Invoice 2 — Final Payment</span><span className="text-[10px] text-gray-400 ml-2">Due upon delivery &amp; acceptance</span></div>
                      <span className="text-sm font-semibold text-brand-dark">{fmtMoney(deposit)}</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-2.5">
                      <div><span className="text-xs font-semibold text-brand-dark">Annual Renewal</span><span className="text-[10px] text-gray-400 ml-2">Due on renewal date each year</span></div>
                      <span className="text-sm font-semibold text-brand-dark">{fmtMoney(annual)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
                Rooted Tech Solutions · rootedtechsolutions.com
              </div>
            </div>
          )}

          {/* ── DOCUMENT 2: SOW ── */}
          {sow && (
            <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-9 pt-7 pb-5 flex items-start justify-between gap-5 border-b-[2.5px] border-brand-dark">
                <div>
                  <p className="text-[20px] font-bold text-brand-brown uppercase tracking-wide mb-1.5">Scope of Work</p>
                  <p className="text-sm text-gray-500">
                    {snapshot.client_company || snapshot.client_name || "Client"}
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
                    Any work requested outside the deliverables listed above — or beyond the allocated monthly hours defined in the accompanying service agreement — is considered a scope change. Scope changes will be assessed, quoted in writing, and require written approval before work begins. Rooted Tech Solutions will not perform out-of-scope work without a signed change order.
                  </p>
                </div>
              </div>
              <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
                Rooted Tech Solutions · rootedtechsolutions.com
              </div>
            </div>
          )}

          {/* ── DOCUMENT 3: CONTRACT + SIGNATURE ── */}
          <div className="bg-white rounded-xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] overflow-hidden">
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

              <div className="mt-8 pt-6 border-t-[1.5px] border-brand-light">
                {contract.contract_status === "signed" ? (
                  <div>
                    <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-3">Electronically Signed</p>
                    <p className="text-2xl text-brand-dark mb-1" style={{ fontFamily: "cursive" }}>{contract.signer_name}</p>
                    <p className="text-xs text-gray-400">{fmtDateTime(contract.signed_at)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-3">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      By clicking the button below, you confirm that you have read and agree to all terms outlined in this service agreement and the accompanying quote. Your electronic signature has the same legal effect as a handwritten signature under the E-SIGN Act.
                    </p>
                    <SignatureForm action={action} />
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-brand-light px-8 py-4 text-center text-xs text-gray-400 bg-brand-cream">
              Rooted Tech Solutions · rootedtechsolutions.com
            </div>
          </div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-8 mb-4">Rooted Tech Solutions · rootedtechsolutions.com</p>
      </div>
    </div>
  );
}
