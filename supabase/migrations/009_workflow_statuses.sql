-- ============================================================
-- Migration 009: workflow statuses
-- ============================================================
-- Two things:
--
--   1. Timestamps for the handoffs that used to be bare status flips, so the
--      Hub can say "sent Mar 2" rather than just "sent". Additive; the app
--      keeps working before this runs (it just records no timestamp).
--
--   2. Signing cascades. Signing the service agreement is the client's
--      acceptance of the quote and their approval of the scope of work it was
--      built on — the SOW's own acknowledgement clause says exactly that. The
--      RPC now records all three instead of leaving the quote at "sent" forever.
--
-- Safe to run at any time. Does not touch existing rows.

alter table public.scope_of_work
  add column if not exists sent_at     timestamptz,
  add column if not exists approved_at timestamptz;

alter table public.quotes
  add column if not exists sent_at     timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz;

-- Replaces the version from migration 004; everything it did is kept.
create or replace function public.sign_contract_by_token(p_token uuid, p_name text, p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract_id uuid;
  v_client_id   uuid;
  v_quote_id    uuid;
  v_rows        int;
begin
  select id, client_id, quote_id
    into v_contract_id, v_client_id, v_quote_id
  from public.contracts
  where sign_token = p_token
    and status = 'sent';

  if v_contract_id is null then
    return false;
  end if;

  update public.contracts
  set status      = 'signed',
      signed_name = p_name,
      signed_at   = now(),
      signed_ip   = p_ip,
      updated_at  = now()
  where id = v_contract_id;

  get diagnostics v_rows = row_count;

  if v_client_id is not null then
    update public.clients
    set contract_signed_date = now()
    where id = v_client_id;
  end if;

  -- Cascade: the quote is accepted and the scope it was built on is approved.
  if v_quote_id is not null then
    update public.quotes
    set status = 'accepted', accepted_at = now()
    where id = v_quote_id and status <> 'accepted';

    update public.scope_of_work
    set status = 'approved', approved_at = now()
    where quote_id = v_quote_id and status <> 'approved';
  end if;

  -- A scope written for this client but never linked to the quote counts too.
  if v_client_id is not null then
    update public.scope_of_work
    set status = 'approved', approved_at = now()
    where client_id = v_client_id and quote_id is null and status <> 'approved';
  end if;

  return v_rows > 0;
end;
$$;

grant execute on function public.sign_contract_by_token(uuid, text, text) to anon, authenticated;
