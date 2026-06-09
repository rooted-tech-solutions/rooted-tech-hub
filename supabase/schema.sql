-- ============================================================
-- Rooted Tech Hub — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable RLS on all tables (auth is handled per-table below)

-- ------------------------------------------------------------
-- CLIENTS
-- ------------------------------------------------------------
create table if not exists public.clients (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  name                text not null,
  company             text,
  email               text,
  phone               text,
  notes               text,
  contract_signed_date date,
  renewal_date        date,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

alter table public.clients enable row level security;

create policy "Users can manage their own clients"
  on public.clients
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- QUOTES
-- ------------------------------------------------------------
create table if not exists public.quotes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references public.clients(id) on delete set null,
  title       text not null,
  description text,
  amount      numeric(12, 2) not null default 0,
  status      text not null default 'draft'
                check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  issued_date date default current_date,
  expiry_date date,
  notes       text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

alter table public.quotes enable row level security;

create policy "Users can manage their own quotes"
  on public.quotes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- INVOICES
-- ------------------------------------------------------------
create table if not exists public.invoices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  client_id    uuid references public.clients(id) on delete set null,
  quote_id     uuid references public.quotes(id) on delete set null,
  invoice_number text unique not null,
  title        text not null,
  description  text,
  amount       numeric(12, 2) not null default 0,
  tax_rate     numeric(5, 2) default 0,
  status       text not null default 'draft'
                 check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  issued_date  date default current_date,
  due_date     date,
  paid_date    date,
  notes        text,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.invoices enable row level security;

create policy "Users can manage their own invoices"
  on public.invoices
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Auto-update updated_at via trigger
-- ------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

create trigger quotes_updated_at
  before update on public.quotes
  for each row execute function public.handle_updated_at();

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.handle_updated_at();
