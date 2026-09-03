/**
 * Where "← Back" goes.
 *
 * Documents belong to a client, and the four list pages are no longer in the
 * navigation, so a bare detail URL falls back to the document's client page —
 * never to a list nobody navigates from. When the page was reached with
 * ?from=…, that wins, and the label says where it leads. Only same-app paths
 * are honoured, so a crafted link can never send a signed-in user off-site
 * (the server actions redirect through the same check).
 */
export function safeFrom(from: unknown): string | undefined {
  return typeof from === "string" && /^\/dashboard(\/|\?|$)/.test(from) ? from : undefined;
}

const LABELS: [RegExp, string][] = [
  [/^\/dashboard\/?(\?|$)/, "Dashboard"],
  [/^\/dashboard\/clients\/[^/?]+/, "Client"],
  [/^\/dashboard\/clients/, "Clients"],
  [/^\/dashboard\/inbox/, "Inbox"],
  [/^\/dashboard\/quotes\/[^/?]+\/preview/, "Package preview"],
  [/^\/dashboard\/quotes\/[^/?]+/, "Quote"],
  [/^\/dashboard\/quotes/, "Quotes"],
  [/^\/dashboard\/contracts\/[^/?]+/, "Contract"],
  [/^\/dashboard\/contracts/, "Contracts"],
  [/^\/dashboard\/scope\/[^/?]+/, "Scope of work"],
  [/^\/dashboard\/scope/, "Scope documents"],
  [/^\/dashboard\/invoices\/[^/?]+/, "Invoice"],
  [/^\/dashboard\/invoices/, "Invoices"],
];

export function backLink(
  from: unknown,
  clientId: string | null | undefined,
  list: { href: string; label: string },
): { href: string; label: string } {
  const safe = safeFrom(from);
  if (safe) {
    const label = LABELS.find(([re]) => re.test(safe))?.[1] ?? "Back";
    return { href: safe, label: `← Back to ${label}` };
  }
  if (clientId) return { href: `/dashboard/clients/${clientId}`, label: "← Back to Client" };
  return { href: list.href, label: `← Back to ${list.label}` };
}
