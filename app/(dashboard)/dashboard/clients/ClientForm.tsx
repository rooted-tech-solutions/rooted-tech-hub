"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

type ClientFormValues = {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  contract_signed_date?: string | null;
  renewal_date?: string | null;
};

type FormState = { error?: string } | null;

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

export default function ClientForm({
  action,
  initialValues,
  submitLabel,
  cancelHref,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: ClientFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, null);
  const [values] = useState<ClientFormValues>(initialValues ?? {});

  return (
    <form action={formAction} className="bg-white rounded-xl border border-brand-light p-6 space-y-5 max-w-2xl">
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="company">
          Company
        </label>
        <input
          id="company"
          name="company"
          defaultValue={values.company ?? ""}
          className={inputClass}
          placeholder="Acme Inc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="name">
            Contact Name *
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={values.name ?? ""}
            className={inputClass}
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={values.email ?? ""}
            className={inputClass}
            placeholder="jane@acme.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={values.phone ?? ""}
            className={inputClass}
            placeholder="(555) 123-4567"
          />
        </div>
        <div />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="contract_signed_date">
            Contract Signed
          </label>
          <input
            id="contract_signed_date"
            name="contract_signed_date"
            type="date"
            defaultValue={values.contract_signed_date ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="renewal_date">
            Renewal Date
          </label>
          <input
            id="renewal_date"
            name="renewal_date"
            type="date"
            defaultValue={values.renewal_date ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={values.notes ?? ""}
          className={inputClass}
          placeholder="Anything worth remembering about this client…"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={submitLabel} />
        <a
          href={cancelHref}
          className="text-sm font-medium text-gray-500 hover:text-brand-dark transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
