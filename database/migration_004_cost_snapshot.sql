-- ============================================================================
-- PrintFlow ERP — Migration 004: Cost price snapshot on quotation items
-- Captures the cost price at the time a quotation line item is created,
-- so Profit & Loss stays accurate even if catalog costs change later.
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

alter table public.quotation_items
  add column if not exists cost_price numeric(12,2) default 0;

comment on column public.quotation_items.cost_price is
  'Snapshot of the catalog cost price when this line item was created. Used for Profit & Loss — not shown to Sales in the UI.';
