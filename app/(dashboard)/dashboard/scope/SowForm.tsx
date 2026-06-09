"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { SowItem, SowValues } from "./actions";

type Client = { id: string; name: string; company: string | null };
type Quote = { id: string; title: string; client_id: string | null };
type FormState = { error?: string } | null;

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent to Client" },
  { value: "approved", label: "Approved" },
];

const inputClass =
  "w-full rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid";
const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";

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

function ItemList({
  label,
  placeholder,
  fieldName,
  initialItems,
  addLabel,
}: {
  label: string;
  placeholder: string;
  fieldName: string;
  initialItems: SowItem[];
  addLabel: string;
}) {
  const [items, setItems] = useState<string[]>(
    initialItems.length > 0 ? initialItems.map((i) => i.item) : [""]
  );

  function update(idx: number, val: string) {
    const next = items.slice();
    next[idx] = val;
    setItems(next);
  }

  function remove(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function add() {
    setItems([...items, ""]);
  }

  const serialized = JSON.stringify(items.filter((i) => i.trim()).map((i) => ({ item: i })));

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input type="hidden" name={fieldName} value={serialized} />
      <div className="space-y-2">
        {items.map((val, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={val}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none px-1"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-xs font-medium text-brand-mid hover:text-brand-dark transition-colors"
      >
        + {addLabel}
      </button>
    </div>
  );
}

export default function SowForm({
  action,
  initialValues,
  clients,
  quotes,
  submitLabel,
  cancelHref,
  from,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues: Partial<SowValues> & { sow_number: string };
  clients: Client[];
  quotes: Quote[];
  submitLabel: string;
  cancelHref: string;
  from?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  const [clientId, setClientId] = useState(initialValues.client_id ?? "");

  // Filter quotes to the selected client
  const filteredQuotes = clientId
    ? quotes.filter((q) => q.client_id === clientId)
    : quotes;

  return (
    <form action={formAction} className="bg-white rounded-xl border border-brand-light p-6 space-y-6 max-w-3xl">
      {from && <input type="hidden" name="from" value={from} />}
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      {/* SOW number + status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="sow_number">SOW Number</label>
          <input
            id="sow_number"
            name="sow_number"
            required
            defaultValue={initialValues.sow_number}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={initialValues.status ?? "draft"} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className={labelClass} htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          defaultValue={initialValues.title ?? ""}
          className={inputClass}
          placeholder="e.g. Trial Analyzer — Scope of Work"
        />
      </div>

      {/* Client + Quote */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="client_id">Client</label>
          <select
            id="client_id"
            name="client_id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClass}
          >
            <option value="">— None —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company || c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="quote_id">Linked Quote</label>
          <select id="quote_id" name="quote_id" defaultValue={initialValues.quote_id ?? ""} className={inputClass}>
            <option value="">— None —</option>
            {filteredQuotes.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Issued date */}
      <div className="max-w-xs">
        <label className={labelClass} htmlFor="issued_date">Date</label>
        <input
          id="issued_date"
          name="issued_date"
          type="date"
          defaultValue={initialValues.issued_date ?? new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
      </div>

      {/* Discovery notes */}
      <div>
        <label className={labelClass} htmlFor="notes">Discovery Notes</label>
        <p className="text-xs text-gray-400 mb-1.5">Jot down what the client told you during your discovery call — goals, problems, context.</p>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          defaultValue={initialValues.notes ?? ""}
          className={inputClass}
          placeholder="e.g. Client needs a centralized dashboard to track trial results across 3 regions. Currently using spreadsheets, data is fragmented…"
        />
      </div>

      <hr className="border-brand-light" />

      {/* Deliverables */}
      <ItemList
        label="Deliverables — What You ARE Building"
        placeholder="e.g. Interactive trial results dashboard with filtering by region and crop"
        fieldName="deliverables_json"
        initialItems={initialValues.deliverables ?? []}
        addLabel="Add deliverable"
      />

      {/* Exclusions */}
      <ItemList
        label="Exclusions — What You Are NOT Doing"
        placeholder="e.g. Mobile app — web only. No third-party API integrations in Phase 1."
        fieldName="exclusions_json"
        initialItems={initialValues.exclusions ?? []}
        addLabel="Add exclusion"
      />

      {/* Assumptions */}
      <ItemList
        label="Assumptions & Client Responsibilities"
        placeholder="e.g. Client will provide all historical trial data in CSV format within 2 weeks of signing."
        fieldName="assumptions_json"
        initialItems={initialValues.assumptions ?? []}
        addLabel="Add assumption"
      />

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
        <a href={cancelHref} className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors">
          Cancel
        </a>
      </div>
    </form>
  );
}
