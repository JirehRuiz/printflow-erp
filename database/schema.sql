-- ============================================================================
-- PrintFlow ERP — Supabase Database Schema
-- Workflow: Lead → Customer → Quotation → Job Order → Production → QC →
--           Delivery → Invoice → Payment → Completed
-- ============================================================================
-- HOW TO RUN:
-- 1. Open your Supabase project → SQL Editor → New Query
-- 2. Paste this whole file → Run
-- 3. It's safe to re-run (uses IF NOT EXISTS / OR REPLACE where possible)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ----------------------------------------------------------------------------
do $$ begin
  create type staff_role as enum ('admin','sales','production','qc','accounts','delivery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum ('new','contacted','qualified','lost','converted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quotation_status as enum ('draft','sent','approved','rejected','revised','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('pending','in_production','on_hold','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_priority as enum ('low','normal','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type production_stage as enum ('design','printing','cutting','laser_cnc','uv','finishing','assembly','ready');
exception when duplicate_object then null; end $$;

do $$ begin
  create type production_status as enum ('not_started','in_progress','paused','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_status as enum ('ready','dispatched','delivered','returned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum ('unpaid','partial','paid','overdue','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_type as enum (
    'digital_printing','large_format','signage','acrylic_fabrication',
    'cnc','laser_cutting','uv_printing','sticker_printing',
    'vehicle_wrap','exhibition_stand','other'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. STAFF (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role staff_role not null default 'sales',
  department text,
  phone text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Auto-create a staff row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.staff (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name','New Staff'), 'sales');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. CUSTOMERS
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  company_name text,
  phone text,
  email text,
  address text,
  trn_number text,               -- tax registration number (UAE VAT etc.)
  source text,                   -- how they found you: referral, website, walk-in...
  notes text,
  created_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 4. LEADS
-- ----------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  status lead_status not null default 'new',
  requirement_summary text,
  assigned_to uuid references public.staff(id),
  created_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 5. QUOTATIONS + LINE ITEMS
-- ----------------------------------------------------------------------------
create sequence if not exists quote_number_seq start 1;

create table if not exists public.quotations (
  id uuid primary key default uuid_generate_v4(),
  quote_number text unique,                  -- e.g. Q-2026-0001
  lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid not null references public.customers(id),
  version int not null default 1,
  parent_quotation_id uuid references public.quotations(id), -- links revisions together
  status quotation_status not null default 'draft',
  valid_until date,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  tax_percent numeric(5,2) default 5,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  terms text,
  created_by uuid references public.staff(id),
  approved_at timestamptz,
  approved_by_name text,                     -- customer-side approver (not a staff account)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.quotation_items (
  id uuid primary key default uuid_generate_v4(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  product_type product_type not null default 'other',
  description text not null,
  material text,
  width numeric(10,2),
  height numeric(10,2),
  unit text default 'pcs',       -- pcs, sqft, sqm, etc.
  qty numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) generated always as (qty * unit_price) stored,
  sort_order int default 0
);

-- Auto-generate quote_number like Q-2026-0001
create or replace function public.set_quote_number()
returns trigger as $$
begin
  if new.quote_number is null then
    new.quote_number := 'Q-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('quote_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_quote_number on public.quotations;
create trigger trg_set_quote_number
  before insert on public.quotations
  for each row execute procedure public.set_quote_number();

-- ----------------------------------------------------------------------------
-- 6. JOB ORDERS (created once quotation is approved)
-- ----------------------------------------------------------------------------
create sequence if not exists job_number_seq start 1;

create table if not exists public.job_orders (
  id uuid primary key default uuid_generate_v4(),
  job_number text unique,
  quotation_id uuid not null references public.quotations(id),
  customer_id uuid not null references public.customers(id),
  status job_status not null default 'pending',
  priority job_priority not null default 'normal',
  due_date date,
  assigned_to uuid references public.staff(id),
  notes text,
  created_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_job_number()
returns trigger as $$
begin
  if new.job_number is null then
    new.job_number := 'JO-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('job_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_job_number on public.job_orders;
create trigger trg_set_job_number
  before insert on public.job_orders
  for each row execute procedure public.set_job_number();

-- ----------------------------------------------------------------------------
-- 7. PRODUCTION ORDERS (per stage, per job order — supports your kanban board)
-- ----------------------------------------------------------------------------
create table if not exists public.production_orders (
  id uuid primary key default uuid_generate_v4(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  stage production_stage not null default 'design',
  status production_status not null default 'not_started',
  machine_name text,
  operator_id uuid references public.staff(id),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 8. QUALITY CONTROL
-- ----------------------------------------------------------------------------
create table if not exists public.quality_checks (
  id uuid primary key default uuid_generate_v4(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  checked_by uuid references public.staff(id),
  passed boolean,
  remarks text,
  checked_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 9. DELIVERIES
-- ----------------------------------------------------------------------------
create table if not exists public.deliveries (
  id uuid primary key default uuid_generate_v4(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  status delivery_status not null default 'ready',
  delivery_date date,
  dispatched_by uuid references public.staff(id),
  received_by_name text,
  delivery_address text,
  notes text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 10. INVOICES + PAYMENTS
-- ----------------------------------------------------------------------------
create sequence if not exists invoice_number_seq start 1;

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text unique,
  job_order_id uuid not null references public.job_orders(id),
  customer_id uuid not null references public.customers(id),
  status invoice_status not null default 'unpaid',
  subtotal numeric(12,2) default 0,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  amount_paid numeric(12,2) default 0,
  due_date date,
  created_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_invoice_number()
returns trigger as $$
begin
  if new.invoice_number is null then
    new.invoice_number := 'INV-' || to_char(now(),'YYYY') || '-' ||
      lpad(nextval('invoice_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_invoice_number on public.invoices;
create trigger trg_set_invoice_number
  before insert on public.invoices
  for each row execute procedure public.set_invoice_number();

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method text,                  -- cash, bank_transfer, card, cheque
  reference_no text,
  paid_at timestamptz default now(),
  recorded_by uuid references public.staff(id)
);

-- Keep invoice.amount_paid and status in sync whenever a payment is added/updated/deleted
create or replace function public.sync_invoice_payment_status()
returns trigger as $$
declare
  v_invoice_id uuid;
  v_total_paid numeric(12,2);
  v_invoice_total numeric(12,2);
begin
  v_invoice_id := coalesce(new.invoice_id, old.invoice_id);

  select coalesce(sum(amount),0) into v_total_paid
  from public.payments where invoice_id = v_invoice_id;

  select total into v_invoice_total
  from public.invoices where id = v_invoice_id;

  update public.invoices
  set amount_paid = v_total_paid,
      status = case
        when v_total_paid <= 0 then 'unpaid'
        when v_total_paid >= v_invoice_total then 'paid'
        else 'partial'
      end,
      updated_at = now()
  where id = v_invoice_id;

  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_invoice_payment on public.payments;
create trigger trg_sync_invoice_payment
  after insert or update or delete on public.payments
  for each row execute procedure public.sync_invoice_payment_status();

-- ----------------------------------------------------------------------------
-- 11. UPDATED_AT HELPER TRIGGER (generic, reusable)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_leads_updated on public.leads;
create trigger trg_leads_updated before update on public.leads
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_quotations_updated on public.quotations;
create trigger trg_quotations_updated before update on public.quotations
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_job_orders_updated on public.job_orders;
create trigger trg_job_orders_updated before update on public.job_orders
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_invoices_updated on public.invoices;
create trigger trg_invoices_updated before update on public.invoices
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 12. INDEXES
-- ----------------------------------------------------------------------------
create index if not exists idx_leads_customer on public.leads(customer_id);
create index if not exists idx_quotations_customer on public.quotations(customer_id);
create index if not exists idx_quotations_lead on public.quotations(lead_id);
create index if not exists idx_job_orders_quotation on public.job_orders(quotation_id);
create index if not exists idx_production_job on public.production_orders(job_order_id);
create index if not exists idx_invoices_job on public.invoices(job_order_id);
create index if not exists idx_payments_invoice on public.payments(invoice_id);

-- ============================================================================
-- 13. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Model: any authenticated staff member can READ most business data
-- (it's an internal ERP, not multi-tenant), but WRITE permissions are
-- restricted by role. Admin can do everything.

alter table public.staff enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.job_orders enable row level security;
alter table public.production_orders enable row level security;
alter table public.quality_checks enable row level security;
alter table public.deliveries enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

-- Helper: get current user's role
create or replace function public.current_staff_role()
returns staff_role as $$
  select role from public.staff where id = auth.uid();
$$ language sql security definer stable;

-- STAFF: everyone can view staff directory; only admin can edit
drop policy if exists "staff_select_all" on public.staff;
create policy "staff_select_all" on public.staff for select
  using (auth.uid() is not null);

drop policy if exists "staff_admin_write" on public.staff;
create policy "staff_admin_write" on public.staff for all
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

-- CUSTOMERS & LEADS: all staff can read/write (sales-driven, low risk)
drop policy if exists "customers_all_access" on public.customers;
create policy "customers_all_access" on public.customers for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "leads_all_access" on public.leads;
create policy "leads_all_access" on public.leads for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- QUOTATIONS: all staff can read; only sales/admin can create/edit
drop policy if exists "quotations_select" on public.quotations;
create policy "quotations_select" on public.quotations for select
  using (auth.uid() is not null);

drop policy if exists "quotations_write" on public.quotations;
create policy "quotations_write" on public.quotations for insert
  with check (public.current_staff_role() in ('sales','admin'));

drop policy if exists "quotations_update" on public.quotations;
create policy "quotations_update" on public.quotations for update
  using (public.current_staff_role() in ('sales','admin'));

drop policy if exists "quotation_items_all" on public.quotation_items;
create policy "quotation_items_all" on public.quotation_items for all
  using (auth.uid() is not null) with check (public.current_staff_role() in ('sales','admin'));

-- JOB ORDERS: all read; sales/admin/production can write
drop policy if exists "job_orders_select" on public.job_orders;
create policy "job_orders_select" on public.job_orders for select
  using (auth.uid() is not null);

drop policy if exists "job_orders_write" on public.job_orders;
create policy "job_orders_write" on public.job_orders for insert
  with check (public.current_staff_role() in ('sales','admin'));

drop policy if exists "job_orders_update" on public.job_orders;
create policy "job_orders_update" on public.job_orders for update
  using (public.current_staff_role() in ('sales','admin','production'));

-- PRODUCTION ORDERS: all read; production/admin can write
drop policy if exists "production_select" on public.production_orders;
create policy "production_select" on public.production_orders for select
  using (auth.uid() is not null);

drop policy if exists "production_write" on public.production_orders;
create policy "production_write" on public.production_orders for all
  using (public.current_staff_role() in ('production','admin'))
  with check (public.current_staff_role() in ('production','admin'));

-- QUALITY CHECKS: all read; qc/admin can write
drop policy if exists "qc_select" on public.quality_checks;
create policy "qc_select" on public.quality_checks for select
  using (auth.uid() is not null);

drop policy if exists "qc_write" on public.quality_checks;
create policy "qc_write" on public.quality_checks for all
  using (public.current_staff_role() in ('qc','admin'))
  with check (public.current_staff_role() in ('qc','admin'));

-- DELIVERIES: all read; delivery/production/admin can write
drop policy if exists "delivery_select" on public.deliveries;
create policy "delivery_select" on public.deliveries for select
  using (auth.uid() is not null);

drop policy if exists "delivery_write" on public.deliveries;
create policy "delivery_write" on public.deliveries for all
  using (public.current_staff_role() in ('delivery','production','admin'))
  with check (public.current_staff_role() in ('delivery','production','admin'));

-- INVOICES & PAYMENTS: all read; accounts/admin can write
drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices for select
  using (auth.uid() is not null);

drop policy if exists "invoices_write" on public.invoices;
create policy "invoices_write" on public.invoices for all
  using (public.current_staff_role() in ('accounts','admin'))
  with check (public.current_staff_role() in ('accounts','admin'));

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments for select
  using (auth.uid() is not null);

drop policy if exists "payments_write" on public.payments;
create policy "payments_write" on public.payments for all
  using (public.current_staff_role() in ('accounts','admin'))
  with check (public.current_staff_role() in ('accounts','admin'));

-- ============================================================================
-- DONE. Next: create your first admin user via Supabase Auth, then run:
--   update public.staff set role = 'admin' where id = '<your-auth-user-uuid>';
-- ============================================================================
