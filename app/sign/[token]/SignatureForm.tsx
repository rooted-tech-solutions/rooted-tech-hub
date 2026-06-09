"use client";

import { useFormState, useFormStatus } from "react-dom";

type FormState = { error?: string; success?: boolean } | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand-dark text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-brand-mid transition-colors disabled:opacity-50"
    >
      {pending ? "Submitting…" : "Sign & Submit"}
    </button>
  );
}

export default function SignatureForm({
  action,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useFormState<FormState, FormData>(action, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-brand-light bg-brand-cream px-6 py-8 text-center">
        <p className="text-lg font-semibold text-brand-dark">Thank you — your signature has been recorded.</p>
        <p className="text-sm text-gray-500 mt-1.5">Rooted Tech Solutions has been notified and will follow up with next steps.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-2xl border border-brand-light bg-white px-6 py-6 space-y-4">
      <p className="text-sm font-semibold text-brand-dark uppercase tracking-wide">Sign this agreement</p>
      <div>
        <label htmlFor="signed_name" className="block text-xs font-semibold uppercase tracking-wide text-brand-mid mb-1.5">
          Full legal name
        </label>
        <input
          id="signed_name"
          name="signed_name"
          type="text"
          required
          placeholder="Type your full name"
          className="w-full border border-brand-light rounded-lg px-3.5 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-brand-mid"
          style={{ fontFamily: "cursive" }}
        />
        <p className="text-xs text-gray-400 mt-1">Typing your name here serves as your electronic signature.</p>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-brand-dark">
        <input type="checkbox" name="agree" className="mt-0.5 accent-brand-mid" />
        <span>I have read and agree to the terms of this agreement, and intend my typed name above to serve as a legally binding electronic signature.</span>
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
