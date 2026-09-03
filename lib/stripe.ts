import Stripe from "stripe";

/**
 * Stripe, or null when STRIPE_SECRET_KEY is not set — so every caller can
 * degrade to "not configured" instead of crashing at import time (the old
 * stub was commented out for exactly this reason).
 *
 * No apiVersion pin: the SDK talks to the version it was built against, which
 * is the version its TypeScript types describe. Pinning a different string
 * would make the types lie.
 */
// Cached per key, not once: in development the env file reloads without a
// restart, and a client built from an old key would silently keep failing.
let cached: { key: string; client: Stripe } | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached || cached.key !== key) cached = { key, client: new Stripe(key) };
  return cached.client;
}

/** "test" | "live" | null — shown in the Hub so nobody wonders which account an invoice hit. */
export function stripeMode(): "test" | "live" | null {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return null;
  return /^(sk|rk)_test_/.test(key) ? "test" : "live";
}
