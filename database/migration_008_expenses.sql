-- ============================================================================
-- PrintFlow ERP — Migration 008: Business Expenses
-- Tracks operating expenses (rent, salaries, utilities, fuel, etc.) so the
-- Profit & Loss report can show real Net Profit, not just Gross Profit
-- from material costs alone.
--
-- Unlike most tables in this app, expenses are restricted to Admin and
-- Accounts for BOTH read and write — there's no operational reason for
-- Sales/Production/QC/Delivery to see company overhead spending.
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  category text not null,          -- e.g. "Rent", "Salaries", "Fuel & Transport"
  description text,
  amount numeric(12,2) not null default 0,
  expense_date date not null default current_date,
  payment_method text,             -- cash, bank_transfer, card, cheque
  supplier_id uuid references public.suppliers(id) on delete set null,
  receipt_reference text,
  notes text,
  created_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_expenses_date on public.expenses(expense_date);
create index if not exists idx_expenses_category on public.expenses(category);

drop trigger if exists trg_expenses_updated on public.expenses;
create trigger trg_expenses_updated before update on public.expenses
  for each row execute procedure public.set_updated_at();

alter table public.expenses enable row level security;

-- Admin + Accounts only — for select AND write, unlike most other tables
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses for select
  using (public.current_staff_role() in ('admin', 'accounts'));

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses for insert
  with check (public.current_staff_role() in ('admin', 'accounts'));

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses for update
  using (public.current_staff_role() in ('admin', 'accounts'))
  with check (public.current_staff_role() in ('admin', 'accounts'));

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses for delete
  using (public.current_staff_role() in ('admin', 'accounts'));
