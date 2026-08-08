-- ============================================================================
-- PrintFlow ERP — Migration 007: Add "Design & Layout" product type
-- ============================================================================
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run
--
-- Note: Postgres requires ALTER TYPE ... ADD VALUE to run outside an
-- explicit transaction block, and it cannot run in the same transaction
-- as a statement that uses the new value. Run this on its own — don't
-- combine it with other SQL in the same query.

alter type product_type add value if not exists 'design_layout';
