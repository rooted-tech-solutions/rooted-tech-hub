-- ============================================================
-- Migration 004: Auto-stamp contract_signed_date and renewal_date
-- ============================================================
-- When a client signs a contract, stamp clients.contract_signed_date.
-- When a final_payment invoice is marked paid, renewal_date is set
-- in the application layer (see invoices/actions.ts markInvoicePaid).
-- This migration only replaces the sign_contract_by_token RPC.

create or replace function public.sign_contract_by_token(p_token uuid, p_name text, p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract_id  uuid;
  v_client_id    uuid;
  v_rows         int;
begin
  -- Look up the contract
  select id, client_id
    into v_contract_id, v_client_id
  from public.contracts
  where sign_token = p_token
    and status = 'sent';

  if v_contract_id is null then
    return false;
  end if;

  -- Sign the contract
  update public.contracts
  set status      = 'signed',
      signed_name = p_name,
      signed_at   = now(),
      signed_ip   = p_ip,
      updated_at  = now()
  where id = v_contract_id;

  get diagnostics v_rows = row_count;

  -- Stamp the client's contract_signed_date
  if v_client_id is not null then
    update public.clients
    set contract_signed_date = now()
    where id = v_client_id;
  end if;

  return v_rows > 0;
end;
$$;

-- Permissions unchanged — grant stays the same
grant execute on function public.sign_contract_by_token(uuid, text, text) to anon, authenticated;
