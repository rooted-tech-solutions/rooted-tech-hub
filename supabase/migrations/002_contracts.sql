-- Contracts: generated from a quote, sent alongside it, and signed electronically by the client.
create table if not exists public.contracts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  quote_id     uuid references public.quotes(id) on delete set null,
  client_id    uuid references public.clients(id) on delete set null,
  status       text not null default 'draft'
                 check (status in ('draft', 'sent', 'signed', 'declined')),
  sign_token   uuid not null default gen_random_uuid(),
  -- Frozen-at-send-time copy of the relevant quote terms, so later quote edits
  -- don't change a contract the client has already received or signed.
  snapshot     jsonb not null default '{}'::jsonb,
  sent_at      timestamptz,
  signed_name  text,
  signed_at    timestamptz,
  signed_ip    text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

create unique index if not exists contracts_sign_token_idx on public.contracts (sign_token);

alter table public.contracts enable row level security;

create policy "Users can manage their own contracts"
  on public.contracts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger contracts_updated_at
  before update on public.contracts
  for each row execute function public.handle_updated_at();

-- ------------------------------------------------------------
-- Public, token-based access for the e-signature flow.
-- The sign_token is an unguessable UUID acting as a bearer credential,
-- so these run as security definer and bypass RLS deliberately —
-- the same pattern as any "share link" feature.
-- ------------------------------------------------------------
create or replace function public.get_contract_by_token(p_token uuid)
returns table (
  id          uuid,
  status      text,
  snapshot    jsonb,
  sent_at     timestamptz,
  signed_name text,
  signed_at   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select c.id, c.status, c.snapshot, c.sent_at, c.signed_name, c.signed_at
    from public.contracts c
    where c.sign_token = p_token;
end;
$$;

grant execute on function public.get_contract_by_token(uuid) to anon, authenticated;

create or replace function public.sign_contract_by_token(p_token uuid, p_name text, p_ip text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  update public.contracts
  set status = 'signed',
      signed_name = p_name,
      signed_at = now(),
      signed_ip = p_ip
  where sign_token = p_token
    and status = 'sent';

  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

grant execute on function public.sign_contract_by_token(uuid, text, text) to anon, authenticated;
