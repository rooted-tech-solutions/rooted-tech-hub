import { annualValue, fmtMoney, sumItems, summarizeBuild } from "./lineItems";
import type { LineItem } from "./actions";

/**
 * The generalized cost estimate: what a client reads.
 *
 * Three phases with what each includes and a phase total, then the care plan
 * as hours per month, what it covers, and the monthly and annual price. No
 * hours × rate arithmetic anywhere — that is the pricing worksheet, and it
 * stays on the owner's itemized view. Used by the quote page, the package
 * preview, and the public signing page.
 */
function SectionTitle({ num, title }: { num: number; title: string }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center gap-2 border-b-[1.5px] border-brand-mid pb-1 text-sm font-bold text-brand-dark">
      <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-brand-dark text-[11px] font-bold text-white">
        {num}
      </span>
      {title}
    </div>
  );
}

export default function QuoteSummary({
  buildItems,
  maintItems,
  buildTotal,
  monthlyRetainer,
}: {
  buildItems: LineItem[];
  maintItems: LineItem[];
  buildTotal: number | null | undefined;
  monthlyRetainer: number | null | undefined;
}) {
  const phases = summarizeBuild(buildItems);
  const care = sumItems(maintItems);
  const annual = annualValue(monthlyRetainer);

  return (
    <div className="space-y-7">
      {phases.length > 0 && (
        <div>
          <SectionTitle num={1} title="The Build" />
          <div className="divide-y divide-brand-light overflow-hidden rounded-lg border border-brand-light">
            {phases.map((phase) => (
              <div key={phase.key} className="flex items-start justify-between gap-6 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-dark">{phase.title}</p>
                  {phase.blurb && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{phase.blurb}</p>}
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">Includes: {phase.included.join(" · ")}</p>
                </div>
                <p className="whitespace-nowrap pt-0.5 text-sm font-semibold text-brand-dark">{fmtMoney(phase.total)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-brand-light/40 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Total Build Cost</span>
              <span className="text-base font-semibold text-brand-dark">{fmtMoney(buildTotal)}</span>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            One fixed price for the build — half on signing, half on delivery and acceptance. Anything outside this scope is quoted separately before it starts.
          </p>
        </div>
      )}

      {maintItems.length > 0 && (
        <div>
          <SectionTitle num={2} title="Care Plan" />
          <div className="overflow-hidden rounded-lg border border-brand-light">
            <div className="px-4 py-3">
              <p className="text-sm text-brand-dark">
                <span className="font-semibold">{care.hours} hour{care.hours === 1 ? "" : "s"} of support each month</span>, covering:
              </p>
              <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {maintItems.map((item) => (
                  <li key={item.num || item.desc} className="flex gap-2 text-xs leading-relaxed text-gray-600">
                    <span className="flex-shrink-0 font-bold text-brand-mid">•</span>
                    {item.desc}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-brand-light bg-brand-light/40 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Monthly Rate</span>
              <span className="text-base font-semibold text-brand-dark">{fmtMoney(monthlyRetainer)}<span className="text-xs font-normal text-gray-500">/mo</span></span>
            </div>
            <div className="flex items-center justify-between border-t border-brand-light px-4 py-2 text-xs text-gray-500">
              <span>Billed annually · renews yearly · cancel with 30 days&rsquo; notice</span>
              <span className="font-medium text-brand-dark">{fmtMoney(annual)}/yr</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
