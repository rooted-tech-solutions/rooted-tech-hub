import { headers } from "next/headers";
import { SITE } from "@/lib/site";

/**
 * Absolute origin for links that leave the Hub (signing links in emails and
 * PDFs). Order: an explicit NEXT_PUBLIC_APP_URL, then the current request's
 * host, then the marketing domain. Never a hardcoded localhost port — the old
 * fallback pointed at a port this app does not run on.
 */
export function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = headers();
  const host = h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return SITE.domain;
}

export function signLinkFor(token: string): string {
  return `${appOrigin()}/sign/${token}`;
}

/**
 * Origin for links and images inside emails. Never the request host: in
 * development that is localhost, which no mail client can reach, so a logo
 * would render broken. NEXT_PUBLIC_APP_URL if set, else the live site.
 */
export function publicOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? SITE.domain).replace(/\/$/, "");
}
