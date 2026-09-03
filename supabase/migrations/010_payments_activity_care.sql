-- ============================================================
-- Migration 010: payments, activity, care plan hours, change orders
-- ============================================================
-- Ships with the Hub code that uses it. The app tolerates this not having run
-- yet — pages render, the timeline is simply empty and "Send via Stripe"
-- explains itself — but nothing below works until it has. Run it once.
--
--   1. Stripe invoicing: a customer id per client; the Stripe invoice id,
--      hosted payment URL and payment state per Hub invoice.
--   2. Activity timeline: one `events` row per thing that happens to a
--      client, written by the app and by the signing functions below.
--   3. Care plan hours: a monthly log per client against the hours the
--      agreement allocates.
--   4. Change orders: quotes get a kind, and can point at the agreement
--      they modify.
--   5. Signing link tracking: when the client first and last opened it.
--
-- Everything is additive. Nothing here alters existing rows.

-- ── 1. Stripe ───────────────────────────────────────────────────────────────
alter table public.clients
  add column if not exists stripe_customer_id text;

alter table public.invoices
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_hosted_url text,
  add column if not exists stripe_status     text,        -- open | paid | void | uncollectible | payment_failed
  add column if not exists stripe_sent_at    timestamptz,
  add column if not exists paid_via          text;        -- 'stripe' | 'manual'

create unique index if not exists invoices_stripe_invoice_id_idx
  on public.invoices (stripe_invoice_id) where stripe_invoice_id is not null;

-- ── 2. Activity ─────────────────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references public.clients(id) on delete cascade,
  kind        text not null,                      -- package_sent, contract_signed, invoice_paid, …
  summary     text not null,                      -- one human sentence, rendered as-is
  detail      jsonb not null default '{}'::jsonb,
  actor       text not null default 'you' check (actor in ('you', 'client', 'system')),
  ref_type    text,                               -- quote | scope | contract | invoice | client
  ref_id      uuid,
  created_at  timestamptz default now() not null
);

create index if not exists events_client_created_idx on public.events (client_id, created_at desc);
create index if not exists events_user_created_idx   on public.events (user_id, created_at desc);

alter table public.events enable row level security;

drop policy if exists "Users can manage their own events" on public.events;
create policy "Users can manage their own events"
  on public.events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 3. Care plan hours ──────────────────────────────────────────────────────
create table if not exists public.care_hours (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references public.clients(id) on delete cascade not null,
  month       date not null,                      -- first day of the month the work falls in
  hours       numeric(6, 2) not null check (hours > 0),
  note        text,
  created_at  timestamptz default now() not null
);

create index if not exists care_hours_client_month_idx on public.care_hours (client_id, month desc);

alter table public.care_hours enable row level security;

drop policy if exists "Users can manage their own care hours" on public.care_hours;
create policy "Users can manage their own care hours"
  on public.care_hours for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. Change orders ────────────────────────────────────────────────────────
alter table public.quotes
  add column if not exists kind        text not null default 'proposal',
  add column if not exists contract_id uuid references public.contracts(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quotes_kind_check') then
    alter table public.quotes
      add constraint quotes_kind_check check (kind in ('proposal', 'change_order'));
  end if;
end $$;

-- ── 5. Signing link opened ──────────────────────────────────────────────────
alter table public.contracts
  add column if not exists first_opened_at timestamptz,
  add column if not exists last_opened_at  timestamptz;

-- Called by the public signing page on every render. Stamps the contract and
-- writes one "opened" event per hour at most, so a client re-reading the page
-- does not flood the timeline. Security definer: the caller is anonymous.
create or replace function public.record_package_opened(p_token uuid, p_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id        uuid;
  v_user_id   uuid;
  v_client_id uuid;
  v_last      timestamptz;
begin
  select id, user_id, client_id, last_opened_at
    into v_id, v_user_id, v_client_id, v_last
  from public.contracts
  where sign_token = p_token
    and status in ('sent', 'signed');

  if v_id is null then
    return;
  end if;

  update public.contracts
  set first_opened_at = coalesce(first_opened_at, now()),
      last_opened_at  = now()
  where id = v_id;

  if v_last is null or v_last < now() - interval '1 hour' then
    insert into public.events (user_id, client_id, kind, summary, detail, actor, ref_type, ref_id)
    values (v_user_id, v_client_id, 'package_opened',
            case when v_last is null then 'Client opened the package for the first time'
                 else 'Client opened the package again' end,
            jsonb_build_object('ip', p_ip), 'client', 'contract', v_id);
  end if;
end;
$$;

grant execute on function public.record_package_opened(uuid, text) to anon, authenticated;

-- Signing: everything 009 did, plus an event.
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
  v_user_id     uuid;
  v_rows        int;
begin
  select id, client_id, quote_id, user_id
    into v_contract_id, v_client_id, v_quote_id, v_user_id
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

  if v_quote_id is not null then
    update public.quotes
    set status = 'accepted', accepted_at = now()
    where id = v_quote_id and status <> 'accepted';

    update public.scope_of_work
    set status = 'approved', approved_at = now()
    where quote_id = v_quote_id and status <> 'approved';
  end if;

  if v_client_id is not null then
    update public.scope_of_work
    set status = 'approved', approved_at = now()
    where client_id = v_client_id and quote_id is null and status <> 'approved';
  end if;

  insert into public.events (user_id, client_id, kind, summary, detail, actor, ref_type, ref_id)
  values (v_user_id, v_client_id, 'contract_signed',
          'Agreement signed by ' || p_name,
          jsonb_build_object('ip', p_ip), 'client', 'contract', v_contract_id);

  return v_rows > 0;
end;
$$;

grant execute on function public.sign_contract_by_token(uuid, text, text) to anon, authenticated;
