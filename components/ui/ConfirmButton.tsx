"use client";

import { useEffect, useState } from "react";

/**
 * A destructive button that needs two clicks.
 *
 * First click arms it (label changes to the confirm text, button becomes the
 * form's real submit); it disarms itself after a few seconds if left alone.
 * Native confirm() is deliberately not used — it is blocked inside embedded
 * previews and reads as a browser error rather than part of the tool.
 *
 * `disabled` renders an inert, muted label carrying `disabledReason` as its
 * tooltip — for records that must never be deleted (signed contracts, paid
 * invoices, clients that still own documents).
 */
export default function ConfirmButton({
  label,
  confirmLabel = "Delete — are you sure?",
  className = "text-sm font-medium text-red-600 hover:text-red-800 transition-colors px-2 py-2",
  armedClassName = "text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg px-3 py-2 transition-colors",
  disabled = false,
  disabledReason,
}: {
  label: string;
  confirmLabel?: string;
  className?: string;
  armedClassName?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  if (disabled) {
    return (
      <span
        title={disabledReason}
        aria-disabled
        className="inline-flex cursor-not-allowed items-center px-2 py-2 text-sm font-medium text-gray-300"
      >
        {label}
      </span>
    );
  }

  return armed ? (
    <button type="submit" className={armedClassName} aria-live="polite">
      {confirmLabel}
    </button>
  ) : (
    <button type="button" onClick={() => setArmed(true)} className={className}>
      {label}
    </button>
  );
}
