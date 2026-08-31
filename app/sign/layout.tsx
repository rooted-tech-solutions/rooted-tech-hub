import type { Metadata } from "next";

// Client contract signing links are unguessable but public. They must never be
// indexed — a crawled link would put a client's agreement into search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
