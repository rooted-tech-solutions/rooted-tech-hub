"use client";

import { useState } from "react";
import { fmtMoney } from "./lineItems";
import type { LineItem } from "./actions";

export default function LineItemTable({
  fieldName,
  initialItems,
  title,
  subtotalLabel,
  defaultRate,
  onSubtotalChange,
  variant = "build",
}: {
  fieldName: string;
  initialItems: LineItem[];
  title: string;
  subtotalLabel: string;
  defaultRate?: number;
  onSubtotalChange?: (subtotal: number) => void;
  variant?: "build" | "maintenance";
}) {
  const [rows, setRows] = useState<LineItem[]>(initialItems);

  const subtotal = rows.reduce((sum, row) => sum + (row.hours || 0) * (row.rate || (defaultRate ?? 0)), 0);
  const totalHours = rows.reduce((sum, row) => sum + (row.hours || 0), 0);
  const totalWeeks = totalHours / 40;

  function emit(next: LineItem[]) {
    setRows(next);
    onSubtotalChange?.(next.reduce((sum, row) => sum + (row.hours || 0) * (row.rate || (defaultRate ?? 0)), 0));
  }

  function update(i: number, field: keyof LineItem, value: string) {
    const next = rows.slice();
    if (field === "hours" || field === "rate") {
      const num = value === "" ? 0 : Number(value);
      next[i] = { ...next[i], [field]: Number.isNaN(num) ? 0 : num };
    } else {
      next[i] = { ...next[i], [field]: value };
    }
    emit(next);
  }

  function addRow() {
    emit([...rows, { num: "", desc: "", hours: 0, rate: defaultRate ?? 0 }]);
  }

  function removeRow(i: number) {
    emit(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide">{title}</p>
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-medium text-brand-mid hover:text-brand-dark transition-colors"
        >
          + Add Row
        </button>
      </div>

      <input
        type="hidden"
        name={fieldName}
        value={JSON.stringify(rows.map((row) => ({ ...row, rate: row.rate || defaultRate || 0 })))}
      />

      <div className="border border-brand-light rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-cream text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 font-medium w-16">#</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium w-24">Hours</th>
              <th className="px-3 py-2 font-medium w-28">Rate</th>
              <th className="px-3 py-2 font-medium w-28 text-right">Total</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-brand-light">
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.num}
                    onChange={(e) => update(i, "num", e.target.value)}
                    placeholder="1.1"
                    className="w-full rounded-md border border-brand-light px-2 py-1 text-xs font-mono text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={row.desc}
                    onChange={(e) => update(i, "desc", e.target.value)}
                    placeholder="Description"
                    className="w-full rounded-md border border-brand-light px-2 py-1 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={row.hours || ""}
                    onChange={(e) => update(i, "hours", e.target.value)}
                    placeholder="0"
                    className="w-full rounded-md border border-brand-light px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={row.rate || ""}
                    onChange={(e) => update(i, "rate", e.target.value)}
                    placeholder={defaultRate ? String(defaultRate) : "0"}
                    className="w-full rounded-md border border-brand-light px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium text-brand-dark">
                  {fmtMoney((row.hours || 0) * (row.rate || (defaultRate ?? 0)))}
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-gray-300 hover:text-red-500 transition-colors"
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-400">
                  No line items yet — click &quot;+ Add Row&quot; to start.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-brand-light bg-brand-light/40">
              <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-brand-dark">
                {subtotalLabel}
              </td>
              <td className="px-3 py-2 text-right font-semibold text-brand-dark">{fmtMoney(subtotal)}</td>
              <td />
            </tr>
            {variant === "build" && totalHours > 0 && (
              <tr className="border-t border-brand-light/60 bg-brand-cream/60">
                <td colSpan={4} className="px-3 py-1.5 text-right text-[10px] text-gray-500 italic">
                  ≈ Build duration
                </td>
                <td className="px-3 py-1.5 text-right text-[10px] font-medium text-brand-mid">
                  {totalWeeks.toFixed(1)} weeks
                </td>
                <td />
              </tr>
            )}
            {variant === "maintenance" && subtotal > 0 && (
              <tr className="border-t border-brand-light/60 bg-brand-cream/60">
                <td colSpan={4} className="px-3 py-1.5 text-right text-[10px] text-gray-500 italic">
                  Annual total (×12)
                </td>
                <td className="px-3 py-1.5 text-right text-[10px] font-medium text-brand-mid">
                  {fmtMoney(subtotal * 12)}/yr
                </td>
                <td />
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
}
