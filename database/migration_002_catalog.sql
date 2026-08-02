-- ============================================================================
-- PrintFlow ERP — Migration 002: Product/Material Catalog
-- Adds a reusable price list per product type, used to auto-fill quotation
-- line items (description, material, unit, selling price) via dropdown.
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

create table if not exists public.catalog_items (
  id uuid primary key default uuid_generate_v4(),
  product_type product_type not null,
  name text not null,                 -- shown in the dropdown, e.g. "Vinyl Gloss Sticker"
  description text not null,          -- default line-item description text
  material text,
  unit text default 'pcs',
  cost_price numeric(12,2) default 0,
  selling_price numeric(12,2) default 0,
  is_active boolean default true,
  created_by uuid references public.staff(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_catalog_items_product_type on public.catalog_items(product_type);

drop trigger if exists trg_catalog_items_updated on public.catalog_items;
create trigger trg_catalog_items_updated before update on public.catalog_items
  for each row execute procedure public.set_updated_at();

-- RLS: everyone can read active catalog items (needed for the quotation
-- dropdown); only admin can create/edit/delete, since cost_price affects
-- margins across the whole business.
alter table public.catalog_items enable row level security;

drop policy if exists "catalog_select_all" on public.catalog_items;
create policy "catalog_select_all" on public.catalog_items for select
  using (auth.uid() is not null);

drop policy if exists "catalog_admin_write" on public.catalog_items;
create policy "catalog_admin_write" on public.catalog_items for all
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

-- ============================================================================
-- DONE. A few starter items so the dropdown isn't empty on first use —
-- feel free to edit/delete these from the Catalog page once the app is live.
-- ============================================================================
insert into public.catalog_items (product_type, name, description, material, unit, cost_price, selling_price)
values
  ('sticker_printing', 'Vinyl Gloss Sticker', 'Die-cut vinyl sticker, gloss finish', 'Vinyl (Gloss)', 'pcs', 2.00, 5.00),
  ('sticker_printing', 'Vinyl Matte Sticker', 'Die-cut vinyl sticker, matte finish', 'Vinyl (Matte)', 'pcs', 2.20, 5.50),
  ('large_format', 'Flex Banner', 'Outdoor flex banner printing', 'Flex 440gsm', 'sqft', 3.50, 8.00),
  ('signage', 'Acrylic LED Signage', 'Backlit acrylic signage with LED module', 'Acrylic 10mm', 'sqft', 45.00, 95.00),
  ('vehicle_wrap', 'Full Vehicle Wrap', 'Full body vinyl wrap, cast vinyl', 'Cast Vinyl', 'set', 1500.00, 2800.00)
on conflict do nothing;
