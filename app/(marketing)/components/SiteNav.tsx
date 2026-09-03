import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";

const links = [
  { label: "What we build", href: "#services" },
  { label: "How it works", href: "#process" },
  { label: "Recent work", href: "#work" },
];

/**
 * Deliberately not the Hub's 256px dark sidebar — a slim transparent bar over
 * the hero. Losing the sidebar is the single biggest signal that this is a
 * different surface from the tool.
 *
 * Server-rendered with no client JS: nav links are plain anchors, and on small
 * screens they collapse to the CTA alone rather than a hamburger menu. A
 * one-page site does not need a menu to reach four anchors.
 */
export default function SiteNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label={`${SITE.name} home`}>
          <Image
            src="/logo.png"
            alt={SITE.name}
            width={300}
            height={138}
            priority
            className="h-20 w-auto sm:h-24"
          />
        </Link>

        <div className="ml-auto hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-[15px] font-medium text-site-body transition-colors hover:bg-white/70 hover:text-site-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/*
          No CTA and no sign-in link up here. "Start a project" sits front and
          centre in the hero, and /login is the owner's door into the Hub —
          it lives quietly in the footer instead.
        */}
      </nav>
    </header>
  );
}
