"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/login/actions";

const nav = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8zm6 4a2 2 0 100-4 2 2 0 000 4zM5 16a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
  },
  {
    label: "Quotes",
    href: "/dashboard/quotes",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: "Invoices",
    href: "/dashboard/invoices",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    label: "Contracts",
    href: "/dashboard/contracts",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    label: "Scope of Work",
    href: "/dashboard/scope",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-gradient-to-b from-brand-dark via-brand-dark to-brand-mid/90 text-white min-h-screen relative overflow-hidden">
      {/* Ambient glow accents */}
      <div className="pointer-events-none absolute -top-24 -right-20 w-64 h-64 rounded-full bg-brand-light/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-16 w-56 h-56 rounded-full bg-brand-brown/10 blur-3xl" />

      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10 relative">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white p-2 ring-1 ring-white/20 shadow-sm">
            <Image src="/logo-icon.png" alt="Rooted Tech Solutions" width={118} height={138} className="h-16 w-auto flex-shrink-0" priority />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight bg-gradient-to-r from-white to-brand-light bg-clip-text text-transparent">
              Rooted Tech Hub
            </p>
            <p className="text-[10px] text-brand-light/60 leading-tight tracking-wide">Business Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 relative">
        {nav.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-to-r from-brand-mid to-brand-mid/70 text-white shadow-lg shadow-brand-mid/30 ring-1 ring-white/10"
                  : "text-brand-light/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={active ? "text-white" : "text-brand-light/50 group-hover:text-brand-light"}>
                {item.icon}
              </span>
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-light shadow-[0_0_8px_2px_rgba(216,234,224,0.6)]" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="px-3 pb-5 border-t border-white/10 pt-4 relative">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-brand-light/65 hover:bg-white/5 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
