-- ============================================================================
-- PrintFlow ERP — Migration 003: Sales can add/edit catalog items
-- Sales staff can now create and update catalog items (materials, pricing).
-- Deleting items stays admin-only, since removed items could be referenced
-- by historical quotations. Cost price/margin visibility is still enforced
-- entirely in the app layer (Sales never sees those fields or columns).
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

drop policy if exists "catalog_admin_write" on public.catalog_items;

drop policy if exists "catalog_insert" on public.catalog_items;
create policy "catalog_insert" on public.catalog_items for insert
  with check (public.current_staff_role() in ('admin', 'sales'));

drop policy if exists "catalog_update" on public.catalog_items;
create policy "catalog_update" on public.catalog_items for update
  using (public.current_staff_role() in ('admin', 'sales'))
  with check (public.current_staff_role() in ('admin', 'sales'));

drop policy if exists "catalog_delete" on public.catalog_items;
create policy "catalog_delete" on public.catalog_items for delete
  using (public.current_staff_role() = 'admin');
