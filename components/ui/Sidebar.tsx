"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";

/**
 * Three destinations, in the order work arrives: Dashboard (what needs doing),
 * Inbox (new leads), Clients (everything about one relationship). Quotes,
 * scope docs, contracts and invoices belong to a client and are reached from
 * that client's page — their list routes exist for deep links, not as nav.
 *
 * Desktop: a sidebar. Phone: the same three items as a bottom tab bar, so a
 * lead can be read or an invoice marked paid from the truck.
 */
const NAV = [
  {
    label: "Dashboard",
    href: "/dashboard",
    isActive: (p: string) => p === "/dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
    isActive: (p: string) => p.startsWith("/dashboard/inbox"),
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
      </svg>
    ),
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    isActive: (p: string) => /^\/dashboard\/(clients|quotes|contracts|scope|invoices)/.test(p),
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8zm6 4a2 2 0 100-4 2 2 0 000 4zM5 16a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
  },
];

const signOutIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
);

export default function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden min-h-screen w-64 flex-shrink-0 flex-col bg-brand-dark text-white md:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="rounded-lg bg-white p-1">
              <Image src="/logo-icon.png" alt="" width={118} height={138} className="h-8 w-auto" priority />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight">Rooted Tech Hub</span>
              <span className="block text-[11px] leading-tight text-brand-light/60">Business management</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-white" : "text-brand-light/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={active ? "text-brand-light" : "text-brand-light/50"}>{item.icon}</span>
                {item.label}
                {item.href === "/dashboard/inbox" && unreadCount > 0 && (
                  <span className="ml-auto min-w-[20px] rounded-full bg-brand-light px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-brand-dark">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 pb-5 pt-4">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-light/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              {signOutIcon}
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Phone: bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-white/10 bg-brand-dark pb-[env(safe-area-inset-bottom)] text-white md:hidden"
      >
        {NAV.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-white" : "text-brand-light/60"}`}
            >
              {item.icon}
              {item.label}
              {item.href === "/dashboard/inbox" && unreadCount > 0 && (
                <span className="absolute right-1/4 top-1.5 min-w-[18px] rounded-full bg-brand-light px-1 text-center text-[10px] font-bold leading-[18px] text-brand-dark">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
        <form action={logout} className="flex flex-1">
          <button type="submit" className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-brand-light/60">
            {signOutIcon}
            Sign out
          </button>
        </form>
      </nav>
    </>
  );
}
