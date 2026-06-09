"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

type Client = { id: string; name: string; company: string | null };
type Quote = {
  id: string;
  title: string;
  client_id: string | null;
  project_name: string | null;
  scope: string | null;
  build_total: number | null;
  monthly_retainer: number | null;
};

type InvoiceFormValues = {
  invoice_number?: string | null;
  invoice_type?: string | null;
  title?: string | null;
  client_id?: string | null;
  quote_id?: string | null;
  description?: string | null;
  amount?: number | null;
  tax_rate?: number | null;
  status?: string | null;
  issued_date?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  notes?: string | null;
};

type FormState = { error?: string } | null;

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const INVOICE_TYPES = [
  { value: "deposit", label: "Deposit (50% of build + year 1 maintenance)" },
  { value: "final_payment", label: "Final Payment (50% of build + year 1 maintenance)" },
  { value: "annual_renewal", label: "Annual Renewal (maintenance only)" },
  { value: "custom", label: "Custom Amount" },
];

function computeAmount(type: string, quote: Quote | null): string {
  if (!quote) return "";
  const annual = (quote.monthly_retainer ?? 0) * 12;
  const contractTotal = (quote.build_total ?? 0) + annual;
  switch (type) {
    case "deposit":
      return String((contractTotal / 2).toFixed(2));
    case "final_payment":
      return String((contractTotal / 2).toFixed(2));
    case "annual_renewal":
      return String(annual.toFixed(2));
    default:
      return "";
  }
}

function typeLabel(type: string, quote: Quote | null): string {
  if (!quote) return "";
  const annual = (quote.monthly_retainer ?? 0) * 12;
  const contractTotal = (quote.build_total ?? 0) + annual;
  const half = contractTotal / 2;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  switch (type) {
    case "deposit":
      return `50% of ${fmt(contractTotal)} total = ${fmt(half)}`;
    case "final_payment":
      return `50% of ${fmt(contractTotal)} total = ${fmt(half)}`;
    case "annual_renewal":
      return `${fmt(quote.monthly_retainer ?? 0)}/mo × 12 = ${fmt(annual)}`;
    default:
      return "";
  }
}

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

export default function InvoiceForm({
  action,
  initialValues,
  clients,
  quotes,
  submitLabel,
  cancelHref,
  from,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: InvoiceFormValues;
  clients: Client[];
  quotes: Quote[];
  submitLabel: string;
  cancelHref: string;
  from?: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  const [values] = useState<InvoiceFormValues>(initialValues ?? {});

  const [clientId, setClientId] = useState(values.client_id ?? "");
  const [quoteId, setQuoteId] = useState(values.quote_id ?? "");
  const [invoiceType, setInvoiceType] = useState(values.invoice_type ?? "deposit");
  const [title, setTitle] = useState(values.title ?? "");
  const [amount, setAmount] = useState<string>(values.amount != null ? String(values.amount) : "");
  const [description, setDescription] = useState(values.description ?? "");
  const [issuedDate, setIssuedDate] = useState(values.issued_date ?? "");
  const [dueDate, setDueDate] = useState(values.due_date ?? "");
  const [status, setStatus] = useState(values.status ?? "draft");
  const [paidDate, setPaidDate] = useState(values.paid_date ?? "");

  function handleIssuedDateChange(val: string) {
    setIssuedDate(val);
    if (val && !dueDate) {
      const d = new Date(val + "T00:00:00");
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().slice(0, 10));
    }
  }

  function handleStatusChange(val: string) {
    setStatus(val);
    if (val === "paid" && !paidDate) {
      setPaidDate(new Date().toISOString().slice(0, 10));
    }
  }

  const selectedQuote = quotes.find((q) => q.id === quoteId) ?? null;
  const isAutoAmount = invoiceType !== "custom";
  const autoAmount = isAutoAmount ? computeAmount(invoiceType, selectedQuote) : "";
  const hint = isAutoAmount ? typeLabel(invoiceType, selectedQuote) : "";

  function handleQuoteChange(newQuoteId: string) {
    setQuoteId(newQuoteId);
    const quote = quotes.find((q) => q.id === newQuoteId);
    if (!quote) return;
    if (quote.client_id) setClientId(quote.client_id);
    const base = quote.project_name || quote.title;
    const typeLabels: Record<string, string> = {
      deposit: "Deposit",
      final_payment: "Final Payment",
      annual_renewal: "Annual Renewal",
      custom: "Invoice",
    };
    setTitle(`${base} — ${typeLabels[invoiceType] ?? "Invoice"}`);
    if (quote.scope) setDescription(quote.scope);
  }

  function handleTypeChange(newType: string) {
    setInvoiceType(newType);
    // Update title suffix
    if (selectedQuote) {
      const base = selectedQuote.project_name || selectedQuote.title;
      const typeLabels: Record<string, string> = {
        deposit: "Deposit",
        final_payment: "Final Payment",
        annual_renewal: "Annual Renewal",
        custom: "Invoice",
      };
      setTitle(`${base} — ${typeLabels[newType] ?? "Invoice"}`);
    }
    // Reset manual amount when switching away from custom
    if (newType !== "custom") setAmount("");
  }

  return (
    <form action={formAction} className="bg-white rounded-xl border border-brand-light p-6 space-y-5 max-w-2xl">
      {from && <input type="hidden" name="from" value={from} />}
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      {/* Invoice type — first so it drives everything else */}
      <div>
        <label className={labelClass}>Invoice Type *</label>
        <div className="grid grid-cols-2 gap-2">
          {INVOICE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTypeChange(t.value)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                invoiceType === t.value
                  ? "border-brand-mid bg-brand-light/40 text-brand-dark font-medium ring-1 ring-brand-mid/30"
                  : "border-brand-light text-gray-500 hover:border-brand-mid/40 hover:text-brand-dark"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="invoice_type" value={invoiceType} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="invoice_number">Invoice Number *</label>
          <input
            id="invoice_number"
            name="invoice_number"
            required
            defaultValue={values.invoice_number ?? ""}
            className={`${inputClass} font-mono`}
            placeholder="INV-1001"
          />
          <p className="mt-1 text-xs text-gray-400">Auto-generated — you can override if needed.</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="title">Title *</label>
          <input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Project name — Deposit"
          />
        </div>
      </div>

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
          <select
            id="quote_id"
            name="quote_id"
            value={quoteId}
            onChange={(e) => handleQuoteChange(e.target.value)}
            className={inputClass}
          >
            <option value="">— None —</option>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">Auto-fills client, amount &amp; description.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="amount">Amount (USD)</label>
          {isAutoAmount ? (
            <>
              <input type="hidden" name="amount" value={autoAmount} />
              <div className={`${inputClass} bg-brand-cream text-brand-dark font-semibold`}>
                {autoAmount
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      parseFloat(autoAmount)
                    )
                  : <span className="text-gray-400 font-normal">Select a quote above</span>}
              </div>
              {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
            </>
          ) : (
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className={inputClass}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="issued_date">Issued Date</label>
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
          <label className={labelClass} htmlFor="due_date">
            Due Date <span className="normal-case text-[9px] text-brand-mid ml-1">(auto: +30 days)</span>
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="paid_date">
            Paid Date <span className="normal-case text-[9px] text-brand-mid ml-1">(auto on paid)</span>
          </label>
          <input
            id="paid_date"
            name="paid_date"
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          placeholder="What this invoice covers…"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">Internal Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={values.notes ?? ""}
          className={inputClass}
          placeholder="Notes visible only to you…"
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
