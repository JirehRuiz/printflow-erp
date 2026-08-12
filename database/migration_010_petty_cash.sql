-- ============================================================================
-- PrintFlow ERP — Migration 010: Petty Cash Inflows (Daily Sales + Top-ups)
--
-- Petty cash BALANCE = sum of inflows here (Daily Sales, Top-ups)
--                     minus sum of expenses where source_of_fund = 'Petty Cash'
--
-- Outflows already live in the expenses table (via source_of_fund) —
-- this migration only adds the missing piece: money coming IN to petty
-- cash, so a full running balance can be calculated.
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

do $$ begin
  create type cash_transaction_type as enum ('daily_sales', 'top_up');
exception when duplicate_object then null; end $$;

create table if not exists public.petty_cash_transactions (
  id uuid primary key default uuid_generate_v4(),
  transaction_type cash_transaction_type not null,
  amount numeric(12,2) not null,
  transaction_date date not null default current_date,
  description text,
  notes text,
  created_by uuid references public.staff(id),
  created_at timestamptz default now()
);

create index if not exists idx_petty_cash_date on public.petty_cash_transactions(transaction_date);

alter table public.petty_cash_transactions enable row level security;

-- Same sensitivity level as expenses: Admin + Accounts only, for read and write
drop policy if exists "petty_cash_select" on public.petty_cash_transactions;
create policy "petty_cash_select" on public.petty_cash_transactions for select
  using (public.current_staff_role() in ('admin', 'accounts'));

drop policy if exists "petty_cash_insert" on public.petty_cash_transactions;
create policy "petty_cash_insert" on public.petty_cash_transactions for insert
  with check (public.current_staff_role() in ('admin', 'accounts'));

drop policy if exists "petty_cash_update" on public.petty_cash_transactions;
create policy "petty_cash_update" on public.petty_cash_transactions for update
  using (public.current_staff_role() in ('admin', 'accounts'))
  with check (public.current_staff_role() in ('admin', 'accounts'));

drop policy if exists "petty_cash_delete" on public.petty_cash_transactions;
create policy "petty_cash_delete" on public.petty_cash_transactions for delete
  using (public.current_staff_role() in ('admin', 'accounts'));
