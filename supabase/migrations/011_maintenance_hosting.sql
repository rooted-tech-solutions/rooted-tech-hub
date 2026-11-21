-- ============================================================
-- Migration 011: Maintenance & Hosting as one annual price
-- ============================================================
-- The care plan was priced as hours × rate per task per month, then shown
-- monthly and billed annually. It is now Maintenance & Hosting: one yearly
-- price and a plain description of what it covers, typed on the quote.
--
-- Run this before saving a quote with the new form — until it has run, the
-- quote save explains that it is missing. Pages keep rendering either way.
--
-- Additive only. Existing quotes keep monthly_retainer and maintenance_items;
-- the app reads a null maintenance_annual as monthly_retainer × 12 and a null
-- description as the old line items, so nothing needs backfilling.

alter table public.quotes
  add column if not exists maintenance_annual      numeric(12, 2),
  add column if not exists maintenance_description text;
