-- Add invoice_type to invoices to track billing stage
alter table public.invoices
  add column if not exists invoice_type text
    check (invoice_type in ('deposit', 'final_payment', 'annual_renewal', 'custom'))
    default 'custom';
