-- ============================================================================
-- PrintFlow ERP — Migration 011: Named Funds
-- Evolves the single "Cash Fund" ledger into multiple named funds:
-- Petty Cash, Manager's Fund, Daily Sales, Other Fund — each with its own
-- balance, total in, and total out. Matches the same names used in
-- Expenses -> Source of Fund, so an expense tagged to a fund correctly
-- reduces that specific fund's balance.
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

alter table public.petty_cash_transactions
  add column if not exists fund_name text;

-- Backfill existing rows:
--  - old 'daily_sales' entries map cleanly to the Daily Sales fund
--  - old 'top_up' entries didn't record which fund they went into — we
--    default them to Manager's Fund as the most likely match (typically
--    an owner/manager deposit). Review and correct any that guessed wrong
--    using the Edit button on the Funds page.
update public.petty_cash_transactions
set fund_name = 'Daily Sales'
where transaction_type = 'daily_sales' and fund_name is null;

update public.petty_cash_transactions
set fund_name = 'Manager''s Fund'
where transaction_type = 'top_up' and fund_name is null;

alter table public.petty_cash_transactions
  alter column fund_name set default 'Petty Cash';

comment on column public.petty_cash_transactions.fund_name is
  'Which fund this inflow belongs to: Petty Cash, Manager''s Fund, Daily Sales, Other Fund (free text, these four are the suggested set).';
