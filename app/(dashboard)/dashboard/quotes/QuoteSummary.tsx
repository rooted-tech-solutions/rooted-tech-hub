import { fmtMoney, summarizeBuild } from "./lineItems";
import { MAINTENANCE_LABEL, type Maintenance } from "./maintenance";
import type { LineItem } from "./actions";

/**
 * The generalized cost estimate: what a client reads.
 *
 * Three phases with what each includes and a phase total, then Maintenance &
 * Hosting as one yearly price and what it covers. No hours × rate arithmetic
 * anywhere — that is the pricing worksheet, and it stays on the owner's
 * itemized view. Used by the quote page, the package preview, and the public
 * signing page.
 */
export function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center gap-2 border-b-[1.5px] border-brand-mid pb-1 text-sm font-bold text-brand-dark">
      <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand-dark text-[11px] font-bold text-white">
        {num}
      </span>
      {title}
    </div>
  );
}

/** Section 2 of every quote document, summary or itemized. */
export function MaintenanceSection({ num = 2, maintenance }: { num?: number; maintenance: Maintenance }) {
  if (maintenance.annual <= 0 && maintenance.lines.length === 0) return null;
  return (
    <div>
      <SectionTitle num={num} title={MAINTENANCE_LABEL} />
      <div className="overflow-hidden rounded-lg border border-brand-light">
        {maintenance.lines.length > 0 && (
          <div className="px-4 py-3">
            {maintenance.lines.length === 1 ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{maintenance.description}</p>
            ) : (
              <>
                <p className="text-sm text-brand-dark">Keeps your software running after launch, covering:</p>
                <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {maintenance.lines.map((line, i) => (
                    <li key={i} className="flex min-w-0 gap-2 break-words text-xs leading-relaxed text-gray-600">
                      <span className="flex-shrink-0 font-bold text-brand-mid">•</span>
                      <span className="min-w-0">{line}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-4 border-t border-brand-light bg-brand-light/40 px-4 py-2.5 first:border-t-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Per Year</span>
          <span className="whitespace-nowrap text-base font-semibold text-brand-dark">
            {fmtMoney(maintenance.annual)}
            <span className="text-xs font-normal text-gray-500">/yr</span>
          </span>
        </div>
        <p className="border-t border-brand-light px-4 py-2 text-xs text-gray-500">
          Billed yearly · renews each year · cancel with 30 days&rsquo; notice
        </p>
      </div>
    </div>
  );
}

export default function QuoteSummary({
  buildItems,
  buildTotal,
  maintenance,
}: {
  buildItems: LineItem[];
  buildTotal: number | null | undefined;
  maintenance: Maintenance;
}) {
  const phases = summarizeBuild(buildItems);

  return (
    <div className="space-y-7">
      {phases.length > 0 && (
        <div>
          <SectionTitle num={1} title="The Build" />
          <div className="divide-y divide-brand-light overflow-hidden rounded-lg border border-brand-light">
            {phases.map((phase) => (
              <div key={phase.key} className="flex items-start justify-between gap-4 px-4 py-3 sm:gap-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">{phase.title}</p>
                  {phase.blurb && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{phase.blurb}</p>}
                  <p className="mt-1.5 break-words text-[11px] leading-relaxed text-gray-400">Includes: {phase.included.join(" · ")}</p>
                </div>
                <p className="whitespace-nowrap pt-0.5 text-sm font-semibold text-brand-dark">{fmtMoney(phase.total)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 bg-brand-light/40 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Total Build Cost</span>
              <span className="whitespace-nowrap text-base font-semibold text-brand-dark">{fmtMoney(buildTotal)}</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            One fixed price for the build — half on signing, half on delivery and acceptance. Anything outside this scope is quoted separately before it starts.
          </p>
        </div>
      )}

      <MaintenanceSection maintenance={maintenance} />
    </div>
  );
}
