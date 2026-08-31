import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

// Only the gated surfaces. Every other route — the marketing pages and the
// public /sign/[token] signing flow — must NOT run this, because updateSession
// calls supabase.auth.getUser(), a network round-trip to Supabase. Matching
// broadly would put that latency in front of every anonymous visitor and force
// the marketing pages to render dynamically.
export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/login"],
};
