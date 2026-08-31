import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import SiteNav from "./components/SiteNav";
import SiteFooter from "./components/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.domain),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.domain,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

/**
 * Public marketing surface.
 *
 * Everything visual for the public site is scoped inside this route group —
 * the Hub imports none of it, and the root layout is untouched. The wrapper
 * paints its own white ground because globals.css sets body to the Hub's
 * cream; without it the marketing pages would sit on the tool's background.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-surface="marketing" className="min-h-screen bg-white text-site-body antialiased">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
