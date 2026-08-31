"use client";

import Script from "next/script";
import { useFormState, useFormStatus } from "react-dom";
import { BUDGET_RANGES, PROJECT_TYPES } from "@/lib/site";
import { submitInquiry, type InquiryState } from "./actions";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const inputClass =
  "w-full min-h-[52px] rounded-2xl bg-site-wash px-4 py-3 text-base text-site-ink " +
  "placeholder:text-site-mute focus:bg-white focus:outline-none focus:ring-2 " +
  "focus:ring-site-accent/40 transition-colors";

const labelClass = "block text-sm font-semibold text-site-ink mb-2";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-site-accent px-8 text-base font-semibold text-white shadow-soft transition-colors hover:bg-site-deep disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send it over"}
    </button>
  );
}

export default function ContactForm() {
  const [state, formAction] = useFormState<InquiryState, FormData>(submitInquiry, null);

  if (state?.success) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-site-mint">
          <svg
            className="h-8 w-8 text-site-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <p className="mt-6 text-2xl font-bold text-site-ink">Got it — thank you.</p>
        <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-site-body">
          I read every one of these myself and will get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/*
        Honeypot. Hidden from people and assistive tech, irresistible to naive
        bots. Kept out of the tab order so a keyboard user never lands in it.
      */}
      <div aria-hidden className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Your name <span className="text-site-accent">*</span>
          </label>
          <input id="name" name="name" required autoComplete="name" className={inputClass} placeholder="Jane Doe" />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Email <span className="text-site-accent">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            placeholder="jane@yourbusiness.com"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="company">
            Business name
          </label>
          <input
            id="company"
            name="company"
            autoComplete="organization"
            className={inputClass}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="project_type">
            What do you need?
          </label>
          <select id="project_type" name="project_type" className={inputClass} defaultValue={PROJECT_TYPES[0]}>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="budget_range">
            Rough budget
          </label>
          <select id="budget_range" name="budget_range" className={inputClass} defaultValue={BUDGET_RANGES[0]}>
            {BUDGET_RANGES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="message">
          What are you trying to solve?
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className={`${inputClass} resize-y`}
          placeholder="Tell me how the work moves through your business today, and where it goes wrong. Rough notes are fine."
        />
      </div>

      {/* Rendered only once Turnstile is configured — see lib/turnstile.ts. */}
      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="light" />
        </>
      )}

      {state?.error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[15px] text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-sm text-site-mute">
        No newsletter, no automated follow-up sequence. Your details are only used to reply to you.
      </p>
    </form>
  );
}
