-- ============================================================
-- Migration 008: Close the direct-API route into submit_inquiry
-- ============================================================
-- Migration 007 granted submit_inquiry to `anon` so the public form could
-- reach it. Testing on 2026-08-31 showed what that actually allows:
--
--   * p_ip is supplied by the CALLER, so hitting PostgREST directly and
--     varying it defeats the per-IP throttle completely.
--   * Omitting p_ip skips the throttle altogether — the guard is
--     `if p_ip is not null`.
--   * The honeypot and Turnstile checks live in the Next.js server action,
--     so a direct caller never encounters them at all.
--
-- The anon key is readable in the page source by design, so "only our form
-- calls this" was never true. The fix is to stop granting it to anon and route
-- the insert through the service role instead (lib/supabase/admin.ts), making
-- the server action the only door — where all three checks apply and the IP
-- comes from the real request headers.
--
-- ⚠ RUN ORDER MATTERS. Set SUPABASE_SERVICE_ROLE_KEY in the environment and
--   confirm a test submission still succeeds BEFORE running this. Revoking
--   first will break the live form.

-- ⚠ The PUBLIC grant is the one that matters. Postgres grants EXECUTE on a new
--   function to PUBLIC automatically, and `anon` is a member of PUBLIC — so
--   revoking the explicit anon grant alone does nothing. Verified on
--   2026-08-31: after revoking from anon only, direct anon calls still
--   succeeded 8/8. PUBLIC must be revoked first.
revoke execute on function
  public.submit_inquiry(text, text, text, text, text, text, text, text)
  from public;

revoke execute on function
  public.submit_inquiry(text, text, text, text, text, text, text, text)
  from anon;

-- Re-grant explicitly to the roles that should keep it. Revoking PUBLIC strips
-- the implicit grant from every role, so these must be stated outright.
grant execute on function
  public.submit_inquiry(text, text, text, text, text, text, text, text)
  to service_role;

grant execute on function
  public.submit_inquiry(text, text, text, text, text, text, text, text)
  to authenticated;
