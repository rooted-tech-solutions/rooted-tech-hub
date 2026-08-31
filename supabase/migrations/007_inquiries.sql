-- ============================================================
-- Migration 007: Website inquiries
-- ============================================================
-- Leads captured by the public marketing page at /. They land here, show up
-- in the Hub inbox, and convert into a client record at the 'prospect'
-- lifecycle stage.

create table if not exists public.inquiries (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  email               text not null,
  company             text,
  phone               text,
  project_type        text,
  budget_range        text,
  message             text,
  status              text not null default 'new'
                        check (status in ('new', 'read', 'converted', 'archived')),
  converted_client_id uuid references public.clients(id) on delete set null,
  source              text default 'website',
  submitted_ip        text,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

alter table public.inquiries enable row level security;

-- Single-operator business: every authenticated user IS the owner. There is
-- deliberately no user_id — a public form has no auth.uid() to attribute a
-- row to, and inventing one would mean hard-coding an owner here.
-- Anonymous visitors get no policy at all: they cannot read, update, or
-- delete. Their only way in is the SECURITY DEFINER function below.
drop policy if exists "Owner reads and manages inquiries" on public.inquiries;
create policy "Owner reads and manages inquiries"
  on public.inquiries
  for all
  to authenticated
  using (true)
  with check (true);

drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.handle_updated_at();

-- Newest-first inbox listing.
create index if not exists inquiries_created_idx
  on public.inquiries (created_at desc);

-- Keeps the per-IP rate-limit lookup below cheap.
create index if not exists inquiries_ip_time_idx
  on public.inquiries (submitted_ip, created_at);

-- ------------------------------------------------------------
-- Public submission
-- ------------------------------------------------------------
-- Same pattern as the signing RPCs in migration 002: security definer, so
-- anonymous visitors can write without being granted any table privilege.
-- They can insert; they can never read anything back.
--
-- NEXT_PUBLIC_SUPABASE_ANON_KEY is, by design, readable in the page source.
-- Anyone can therefore call this endpoint directly and skip the browser
-- entirely — which is why the honeypot and Turnstile checks in the server
-- action are not the last line of defence. The rate limit below is, because
-- it lives inside the function itself.
create or replace function public.submit_inquiry(
  p_name         text,
  p_email        text,
  p_company      text default null,
  p_phone        text default null,
  p_project_type text default null,
  p_budget_range text default null,
  p_message      text default null,
  p_ip           text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_recent int;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Please enter your name.';
  end if;

  if coalesce(trim(p_email), '') = '' then
    raise exception 'Please enter your email address.';
  end if;

  if trim(p_email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please enter a valid email address.';
  end if;

  -- Throttle per IP. 'unknown' is what the server action sends when no
  -- forwarding header is present, so it is not treated as a real identity —
  -- otherwise every such visitor would share one bucket and lock each
  -- other out.
  if p_ip is not null and p_ip <> 'unknown' then
    select count(*) into v_recent
    from public.inquiries
    where submitted_ip = p_ip
      and created_at > now() - interval '1 hour';

    if v_recent >= 3 then
      raise exception 'Too many submissions from this connection. Please try again later.';
    end if;
  end if;

  -- Cap every field. Without this a public endpoint accepts megabytes.
  insert into public.inquiries
    (name, email, company, phone, project_type, budget_range, message, submitted_ip)
  values
    (left(trim(p_name), 200),
     left(trim(p_email), 320),
     left(trim(p_company), 200),
     left(trim(p_phone), 50),
     left(trim(p_project_type), 100),
     left(trim(p_budget_range), 100),
     left(trim(p_message), 5000),
     left(p_ip, 100))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_inquiry(text, text, text, text, text, text, text, text)
  to anon, authenticated;
