import Link from "next/link";
import { SITE } from "@/lib/site";

export default function SiteFooter() {
  const socials = Object.entries(SITE.social).filter(([, href]) => href);

  return (
    <footer className="bg-site-deep text-white/70">
      <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="text-lg font-semibold text-white">{SITE.name}</p>
            <p className="mt-2 text-[15px] leading-relaxed">{SITE.tagline}.</p>

            {/* Labelled like the Site and Legal columns so the footer reads as
                one system rather than a stray address. */}
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/40">
              Get in touch
            </p>
            <div className="flex flex-wrap items-center gap-x-5">
              <a
                href={`mailto:${SITE.email}`}
                className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-white hover:underline"
              >
                {SITE.email}
              </a>
              {SITE.phone && (
                <a
                  href={`tel:${SITE.phone.replace(/[^0-9]/g, "")}`}
                  className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-white hover:underline"
                >
                  {SITE.phone}
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-12 text-[15px]">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Site</p>
              <a href="#services" className="hover:text-white">What I build</a>
              <a href="#process" className="hover:text-white">How it works</a>
              <a href="#contact" className="hover:text-white">Start a project</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Legal</p>
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.{" "}
            <Link href="/login" className="text-white/25 hover:text-white/60">
              Employee login
            </Link>
          </p>
          {socials.length > 0 && (
            <div className="flex gap-5">
              {socials.map(([name, href]) => (
                <a key={name} href={href} className="capitalize hover:text-white">
                  {name}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
