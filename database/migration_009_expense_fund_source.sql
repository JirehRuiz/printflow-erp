-- ============================================================================
-- PrintFlow ERP — Migration 009: Source of Fund on Expenses
-- Tracks WHOSE money paid for an expense (Petty Cash, Cashier, Borrowed,
-- etc.) — distinct from payment_method, which tracks HOW it was paid
-- (cash, bank transfer, card, cheque).
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

alter table public.expenses
  add column if not exists source_of_fund text;

comment on column public.expenses.source_of_fund is
  'Where the money came from, e.g. Petty Cash, Cashier, Company Bank Account, Borrowed, Owner''s Personal Funds.';
