-- ============================================================
-- Migration 005: Scope of Work documents
-- ============================================================

create table if not exists public.scope_of_work (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  client_id    uuid references public.clients(id) on delete set null,
  quote_id     uuid references public.quotes(id) on delete set null,
  sow_number   text not null,                        -- e.g. SOW-001
  title        text,
  status       text not null default 'draft'
                 check (status in ('draft', 'sent', 'approved')),
  -- Discovery call notes (free-form)
  notes        text,
  -- Structured lists stored as JSONB arrays of { item: text }
  deliverables jsonb not null default '[]'::jsonb,   -- what you ARE building
  exclusions   jsonb not null default '[]'::jsonb,   -- what you are NOT doing
  assumptions  jsonb not null default '[]'::jsonb,   -- what client must provide
  issued_date  date,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null
);

alter table public.scope_of_work enable row level security;

create policy "Users can manage their own SOWs"
  on public.scope_of_work
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger scope_of_work_updated_at
  before update on public.scope_of_work
  for each row execute function public.handle_updated_at();

-- Helper to get the next SOW number for a user (SOW-001, SOW-002, …)
create or replace function public.get_next_sow_number(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.scope_of_work
  where user_id = p_user_id;

  return 'SOW-' || lpad((v_count + 1)::text, 3, '0');
end;
$$;

grant execute on function public.get_next_sow_number(uuid) to authenticated;
