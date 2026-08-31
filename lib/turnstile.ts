/**
 * Cloudflare Turnstile verification.
 *
 * Inert until TURNSTILE_SECRET_KEY is set, so local development and the
 * pre-domain period work without a Cloudflare account. Turnstile requires a
 * registered domain, which does not exist yet — see SITE.domain.
 *
 * This is one of three spam layers and NOT the last line of defence: it only
 * protects requests that come through the browser. The rate limit inside the
 * submit_inquiry function (migration 007) is what stops someone calling the
 * PostgREST endpoint directly with the public anon key.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured — do not block submissions
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    // Cloudflare unreachable. Fail open: the rate limit and honeypot still
    // apply, and silently dropping a real lead is the worse outcome.
    console.error("Turnstile verification failed:", err);
    return true;
  }
}
