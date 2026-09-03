"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";

/**
 * Three destinations, in the order work arrives: Dashboard (what needs doing
 * today), Inbox (new leads), Clients (everything about one relationship).
 *
 * Quotes, scope docs, contracts and invoices are deliberately NOT here. None
 * of them means anything apart from the client it belongs to, so they are
 * reached from that client's page. Their list routes still exist for deep
 * links, the back buttons, and the dashboard's money tiles — they are just
 * not destinations, and "Clients" stays lit while you are inside any of them.
 */
const NAV = [
  {
    label: "Dashboard",
    href: "/dashboard",
    isActive: (path: string) => path === "/dashboard",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
    isActive: (path: string) => path.startsWith("/dashboard/inbox"),
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
    ),
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    isActive: (path: string) => /^\/dashboard\/(clients|quotes|contracts|scope|invoices)(\/|$)/.test(path),
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8zm6 4a2 2 0 100-4 2 2 0 000 4zM5 16a2 2 0 100-4 2 2 0 000 4z" />
    ),
  },
];

export default function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-60 flex-shrink-0 flex-col bg-brand-dark text-white">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
          <Image src="/logo-icon.png" alt="" width={118} height={138} className="h-7 w-auto" priority />
        </span>
        <span>
          <span className="block text-sm font-semibold leading-tight">Rooted Tech Hub</span>
          <span className="block text-[11px] leading-tight text-brand-light/60">Business management</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
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
              <svg
                className={`h-5 w-5 ${active ? "text-brand-light" : "text-brand-light/50"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                {item.icon}
              </svg>
              {item.label}
              {item.href === "/dashboard/inbox" && unreadCount > 0 && (
                <span className="ml-auto min-w-[20px] rounded-full bg-brand-light px-1.5 py-0.5 text-center text-[10px] font-bold leading-4 text-brand-dark">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-white/10 px-3 pb-5 pt-4">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-light/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
