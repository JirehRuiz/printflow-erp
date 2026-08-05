-- ============================================================================
-- PrintFlow ERP — Migration 006: Catalog ↔ Inventory linkage + auto-deduction
--
-- Adds:
--  1. quotation_items.catalog_item_id — remembers which catalog item a line
--     item came from (this was tracked in the browser during quote-building
--     but never actually saved to the database until now).
--  2. catalog_items.inventory_item_id + consumption_per_unit — the "recipe"
--     linking a sellable catalog item to the raw material it consumes, and
--     how much of that material one unit of the catalog item uses.
--  3. A trigger that automatically deducts stock the moment a job order
--     starts production — server-side, so it fires no matter which staff
--     role clicked "Start Production" and can't be bypassed by future UI.
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run

alter table public.quotation_items
  add column if not exists catalog_item_id uuid references public.catalog_items(id) on delete set null;

alter table public.catalog_items
  add column if not exists inventory_item_id uuid references public.inventory_items(id) on delete set null,
  add column if not exists consumption_per_unit numeric(12,4) default 0;

comment on column public.catalog_items.consumption_per_unit is
  'How much of the linked inventory item (in the inventory item''s own unit) one unit of this catalog item consumes. E.g. if this catalog item is sold per "pcs" and the linked inventory item is tracked in "sqm", this might be 0.05 (sqm per sticker).';

-- ----------------------------------------------------------------------------
-- Auto-deduction trigger — fires once, the moment a job enters production
-- ----------------------------------------------------------------------------
create or replace function public.deduct_inventory_on_production_start()
returns trigger as $$
declare
  v_existing_count int;
  v_quotation_id uuid;
  v_job_number text;
begin
  -- Only act the very first time a job gets a production_orders row —
  -- later stage transitions (printing -> cutting -> ...) must NOT deduct again.
  select count(*) into v_existing_count
  from public.production_orders
  where job_order_id = new.job_order_id;

  if v_existing_count = 1 then
    select quotation_id into v_quotation_id
    from public.job_orders where id = new.job_order_id;

    select job_number into v_job_number
    from public.job_orders where id = new.job_order_id;

    if v_quotation_id is not null then
      insert into public.stock_movements (inventory_item_id, movement_type, quantity_change, reference)
      select
        ci.inventory_item_id,
        'stock_out'::movement_type,
        -(qi.qty * ci.consumption_per_unit),
        'Auto-deducted for ' || coalesce(v_job_number, 'job') || ' — ' || qi.description
      from public.quotation_items qi
      join public.catalog_items ci on ci.id = qi.catalog_item_id
      where qi.quotation_id = v_quotation_id
        and ci.inventory_item_id is not null
        and ci.consumption_per_unit > 0;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_deduct_inventory_on_production_start on public.production_orders;
create trigger trg_deduct_inventory_on_production_start
  after insert on public.production_orders
  for each row execute procedure public.deduct_inventory_on_production_start();
