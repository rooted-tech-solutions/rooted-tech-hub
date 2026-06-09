-- Add line-item quote builder fields to quotes table
alter table public.quotes
  add column if not exists project_name text,
  add column if not exists scope text,
  add column if not exists timeline text,
  add column if not exists prepared_by text,
  add column if not exists valid_for text default '30 days',
  add column if not exists build_items jsonb not null default '[]'::jsonb,
  add column if not exists maintenance_items jsonb not null default '[]'::jsonb,
  add column if not exists build_total numeric(12, 2) not null default 0,
  add column if not exists monthly_retainer numeric(12, 2) not null default 0;
