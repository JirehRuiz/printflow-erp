-- ============================================================================
-- Optional: backfill realistic cost_price on existing seeded quotation_items
-- so the Profit & Loss report shows a believable margin instead of 100%.
-- Only run this if you loaded seed_dummy_data.sql BEFORE migration_004 added
-- the cost_price column (so those rows are sitting at 0 right now).
--
-- This assumes a ~45% gross margin (cost = 55% of the selling price), which
-- is a reasonable placeholder for testing — adjust the 0.55 multiplier if
-- you want to see different margin scenarios.
-- ============================================================================

update public.quotation_items
set cost_price = round(unit_price * 0.55, 2)
where cost_price = 0 or cost_price is null;
