"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import LineItemTable from "./LineItemTable";
import { BUILD_ITEMS, MAINTENANCE_ITEMS, fmtMoney } from "./lineItems";
import type { LineItem } from "./actions";

type Client = { id: string; name: string; company: string | null };

type QuoteFormValues = {
  title?: string | null;
  client_id?: string | null;
  status?: string | null;
  project_name?: string | null;
  scope?: string | null;
  timeline?: string | null;
  prepared_by?: string | null;
  valid_for?: string | null;
  issued_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  build_items?: LineItem[] | null;
  maintenance_items?: LineItem[] | null;
};

type FormState = { error?: string } | null;

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "expired", label: "Expired" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand-mid text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid";
const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";

export default function QuoteForm({
  action,
  initialValues,
  clients,
  submitLabel,
  cancelHref,
  from,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: QuoteFormValues;
  clients: Client[];
  submitLabel: string;
  cancelHref: string;
  from?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  const [values] = useState<QuoteFormValues>(initialValues ?? {});
  const [defaultRate, setDefaultRate] = useState<number | undefined>(undefined);
  const [buildSubtotal, setBuildSubtotal] = useState(0);
  const [maintSubtotal, setMaintSubtotal] = useState(0);
  const [issuedDate, setIssuedDate] = useState(values.issued_date ?? "");
  const [expiryDate, setExpiryDate] = useState(values.expiry_date ?? "");

  function handleIssuedDateChange(val: string) {
    setIssuedDate(val);
    if (val) {
      const d = new Date(val + "T00:00:00");
      d.setDate(d.getDate() + 30);
      setExpiryDate(d.toISOString().slice(0, 10));
    }
  }

  return (
    <form action={formAction} className="bg-white rounded-xl border border-brand-light p-6 space-y-6 max-w-4xl">
      {from && <input type="hidden" name="from" value={from} />}
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      {/* Basics */}
      <div>
        <label className={labelClass} htmlFor="title">
          Title *
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={values.title ?? ""}
          className={inputClass}
          placeholder="Website redesign — Phase 1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="client_id">
            Client
          </label>
          <select id="client_id" name="client_id" defaultValue={values.client_id ?? ""} className={inputClass}>
            <option value="">— None —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company || c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={values.status ?? "draft"} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="project_name">
            Project
          </label>
          <input
            id="project_name"
            name="project_name"
            defaultValue={values.project_name ?? ""}
            className={inputClass}
            placeholder="Project name"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="timeline">
            Timeline
          </label>
          <input
            id="timeline"
            name="timeline"
            defaultValue={values.timeline ?? ""}
            className={inputClass}
            placeholder="e.g. 8–10 weeks"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="scope">
          Scope
        </label>
        <input
          id="scope"
          name="scope"
          defaultValue={values.scope ?? ""}
          className={inputClass}
          placeholder="Brief description"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="prepared_by">
            Prepared By
          </label>
          <input
            id="prepared_by"
            name="prepared_by"
            defaultValue={values.prepared_by ?? ""}
            className={inputClass}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="issued_date">
            Issued Date
          </label>
          <input
            id="issued_date"
            name="issued_date"
            type="date"
            value={issuedDate}
            onChange={(e) => handleIssuedDateChange(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="expiry_date">
            Expiry Date <span className="normal-case text-[9px] text-brand-mid ml-1">(auto: +30 days)</span>
          </label>
          <input
            id="expiry_date"
            name="expiry_date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="max-w-xs">
        <label className={labelClass} htmlFor="valid_for">
          Valid For
        </label>
        <input
          id="valid_for"
          name="valid_for"
          defaultValue={values.valid_for ?? "30 days"}
          className={inputClass}
          placeholder="30 days"
        />
      </div>

      {/* Default rate helper */}
      <div className="bg-brand-cream rounded-lg border border-brand-light px-4 py-3 flex items-center gap-3">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide" htmlFor="default_rate">
          Default Hourly Rate
        </label>
        <input
          id="default_rate"
          type="number"
          min="0"
          step="5"
          placeholder="e.g. 125"
          onChange={(e) => setDefaultRate(e.target.value ? Number(e.target.value) : undefined)}
          className="w-32 rounded-md border border-brand-light px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid"
        />
        <span className="text-xs text-gray-400">Applies to empty rate fields below</span>
      </div>

      {/* Line item tables */}
      <LineItemTable
        fieldName="build_items_json"
        initialItems={values.build_items?.length ? values.build_items : BUILD_ITEMS.map((i) => ({ ...i, hours: 0, rate: 0 }))}
        title="Build Phase"
        subtotalLabel="Total Build Cost"
        defaultRate={defaultRate}
        onSubtotalChange={setBuildSubtotal}
        variant="build"
      />
      <LineItemTable
        fieldName="maintenance_items_json"
        initialItems={values.maintenance_items?.length ? values.maintenance_items : MAINTENANCE_ITEMS.map((i) => ({ ...i, hours: 0, rate: 0 }))}
        title="Maintenance Phase (Monthly)"
        subtotalLabel="Monthly Rate"
        defaultRate={defaultRate}
        onSubtotalChange={setMaintSubtotal}
        variant="maintenance"
      />

      {/* Grand totals */}
      <div className="bg-brand-light/40 rounded-lg border border-brand-light px-5 py-4 grid grid-cols-3 gap-4 max-w-xl ml-auto">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Build Cost</p>
          <p className="text-lg font-semibold text-brand-dark">{fmtMoney(buildSubtotal)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Rate</p>
          <p className="text-lg font-semibold text-brand-dark">{fmtMoney(maintSubtotal)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Annual Total</p>
          <p className="text-lg font-semibold text-brand-mid">{fmtMoney(maintSubtotal * 12)}</p>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={values.notes ?? ""}
          className={inputClass}
          placeholder="Internal notes…"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
        <a href={cancelHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
          Cancel
        </a>
      </div>
    </form>
  );
}
