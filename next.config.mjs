/** @type {import('next').NextConfig} */

/**
 * Content-Security-Policy.
 *
 * `unsafe-inline` in script-src is a real weakening, and it is deliberate.
 * The alternative is per-request nonces, which require middleware to run on
 * every route — and the middleware matcher is deliberately scoped to
 * /dashboard and /login so the marketing pages stay statically rendered.
 * Nonces would force every page dynamic and undo that.
 *
 * The trade is acceptable here because no page renders user-supplied HTML:
 * inquiry text is only ever read back inside the authenticated Hub, as escaped
 * React text. Revisit if that stops being true.
 *
 * frame-ancestors 'none' is the modern anti-clickjacking control;
 * X-Frame-Options below is the same rule for older browsers.
 */
// Next's dev server evaluates strings as JavaScript for hot reload; production
// builds do not. Granting 'unsafe-eval' only in development keeps the shipped
// policy strict instead of loosening it to suit the dev tooling.
const devOnly = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devOnly} https://js.stripe.com https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Authenticated pages and client contract links must never be stored by
        // a shared cache. Vercel's default is `public, max-age=0,
        // must-revalidate`, which revalidates but still marks the response
        // cacheable by intermediaries.
        source: "/:path(dashboard|login|sign)/:rest*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;
