-- ============================================================================
-- PrintFlow ERP — Migration 005: Inventory & Suppliers
-- Adds supplier directory, inventory/stock tracking, and a stock movement
-- audit trail (every quantity change is logged, not just overwritten).
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

do $$ begin
  create type movement_type as enum ('stock_in', 'stock_out', 'adjustment');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- SUPPLIERS
-- ----------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  category text,              -- e.g. "Vinyl & Media", "Acrylic", "Hardware", "Ink"
  payment_terms text,         -- e.g. "Net 30", "COD"
  notes text,
  is_active boolean default true,
  created_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists trg_suppliers_updated on public.suppliers;
create trigger trg_suppliers_updated before update on public.suppliers
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- INVENTORY ITEMS
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,              -- e.g. "Vinyl", "Acrylic Sheet", "Ink", "Hardware"
  unit text not null default 'pcs',
  quantity_on_hand numeric(12,2) not null default 0,
  reorder_level numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  notes text,
  is_active boolean default true,
  created_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_inventory_supplier on public.inventory_items(supplier_id);

drop trigger if exists trg_inventory_updated on public.inventory_items;
create trigger trg_inventory_updated before update on public.inventory_items
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- STOCK MOVEMENTS (audit trail — every change is logged, quantity_on_hand
-- is derived from this table via trigger, never edited directly)
-- ----------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type movement_type not null,
  quantity_change numeric(12,2) not null,  -- positive = increase, negative = decrease
  reference text,              -- e.g. "PO #123", "Job JO-2026-0004", "Stock count correction"
  notes text,
  created_by uuid references public.staff(id),
  created_at timestamptz default now()
);

create index if not exists idx_stock_movements_item on public.stock_movements(inventory_item_id);

create or replace function public.sync_inventory_quantity()
returns trigger as $$
declare
  v_item_id uuid;
  v_total numeric(12,2);
begin
  v_item_id := coalesce(new.inventory_item_id, old.inventory_item_id);

  select coalesce(sum(quantity_change), 0) into v_total
  from public.stock_movements where inventory_item_id = v_item_id;

  update public.inventory_items
  set quantity_on_hand = v_total,
      updated_at = now()
  where id = v_item_id;

  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_inventory_quantity on public.stock_movements;
create trigger trg_sync_inventory_quantity
  after insert or update or delete on public.stock_movements
  for each row execute procedure public.sync_inventory_quantity();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;

-- Suppliers: everyone reads; admin + production can write; admin-only delete
drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers for select
  using (auth.uid() is not null);

drop policy if exists "suppliers_insert" on public.suppliers;
create policy "suppliers_insert" on public.suppliers for insert
  with check (public.current_staff_role() in ('admin', 'production'));

drop policy if exists "suppliers_update" on public.suppliers;
create policy "suppliers_update" on public.suppliers for update
  using (public.current_staff_role() in ('admin', 'production'))
  with check (public.current_staff_role() in ('admin', 'production'));

drop policy if exists "suppliers_delete" on public.suppliers;
create policy "suppliers_delete" on public.suppliers for delete
  using (public.current_staff_role() = 'admin');

-- Inventory items: everyone reads; admin + production can write; admin-only delete
drop policy if exists "inventory_select" on public.inventory_items;
create policy "inventory_select" on public.inventory_items for select
  using (auth.uid() is not null);

drop policy if exists "inventory_insert" on public.inventory_items;
create policy "inventory_insert" on public.inventory_items for insert
  with check (public.current_staff_role() in ('admin', 'production'));

drop policy if exists "inventory_update" on public.inventory_items;
create policy "inventory_update" on public.inventory_items for update
  using (public.current_staff_role() in ('admin', 'production'))
  with check (public.current_staff_role() in ('admin', 'production'));

drop policy if exists "inventory_delete" on public.inventory_items;
create policy "inventory_delete" on public.inventory_items for delete
  using (public.current_staff_role() = 'admin');

-- Stock movements: everyone reads (it's an audit log); admin + production
-- can add entries; only admin can delete (to correct a genuine mistake)
drop policy if exists "stock_movements_select" on public.stock_movements;
create policy "stock_movements_select" on public.stock_movements for select
  using (auth.uid() is not null);

drop policy if exists "stock_movements_insert" on public.stock_movements;
create policy "stock_movements_insert" on public.stock_movements for insert
  with check (public.current_staff_role() in ('admin', 'production'));

drop policy if exists "stock_movements_delete" on public.stock_movements;
create policy "stock_movements_delete" on public.stock_movements for delete
  using (public.current_staff_role() = 'admin');
