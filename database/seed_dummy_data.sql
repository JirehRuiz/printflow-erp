-- ============================================================================
-- PrintFlow ERP — Sample/Dummy Data Seed
-- Populates customers, leads, quotations, job orders, production stages,
-- QC, deliveries, invoices, and payments so you can see every feature
-- working with realistic data (dashboard, reports, production board, etc).
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New Query -> paste -> Run
-- Safe to run once. Running it again will create duplicate sample records
-- (it doesn't check for existing data), so only run it a single time.
-- ============================================================================

do $$
declare
  cust_ahmed uuid;
  cust_fatima uuid;
  cust_mike uuid;
  cust_sara uuid;
  cust_john uuid;

  lead_ahmed uuid;
  lead_fatima uuid;
  lead_mike uuid;
  lead_mike2 uuid;
  lead_sara uuid;
  lead_john uuid;

  quote1 uuid; -- Ahmed, vehicle wrap, approved -> completed & paid
  quote2 uuid; -- Ahmed, repeat sticker order, approved -> completed & paid
  quote3 uuid; -- Fatima, exhibition stand, approved -> in production
  quote4 uuid; -- Mike, retail stickers, approved -> pending (not started)
  quote5 uuid; -- Sara, office signage, approved -> completed & delivered, partially paid
  quote6 uuid; -- Sara, banners, sent (awaiting decision)
  quote7 uuid; -- John, vehicle wrap, rejected
  quote8 uuid; -- Mike, acrylic stands, draft

  job1 uuid;
  job2 uuid;
  job3 uuid;
  job4 uuid;

  inv1 uuid;
  inv2 uuid;
  inv4 uuid;
begin

  -- =========================================================================
  -- CUSTOMERS
  -- =========================================================================
  insert into customers (name, company_name, phone, email, address, source)
  values ('Ahmed Al Farsi', 'Al Farsi Trading LLC', '+971 50 123 4567', 'ahmed@alfarsitrading.ae', 'Al Quoz Industrial Area 3, Dubai', 'Referral')
  returning id into cust_ahmed;

  insert into customers (name, company_name, phone, email, address, source)
  values ('Fatima Hassan', 'Hassan Events & Exhibitions', '+971 55 234 5678', 'fatima@hassanevents.ae', 'Dubai World Trade Centre, Dubai', 'Website')
  returning id into cust_fatima;

  insert into customers (name, company_name, phone, email, address, source)
  values ('Mike Chen', 'Chen Retail Group', '+971 52 345 6789', 'mike@chenretail.ae', 'Deira, Dubai', 'Walk-in')
  returning id into cust_mike;

  insert into customers (name, company_name, phone, email, address, source)
  values ('Sara Al Mansoori', 'Mansoori Real Estate', '+971 56 456 7890', 'sara@mansoorire.ae', 'Business Bay, Dubai', 'Referral')
  returning id into cust_sara;

  insert into customers (name, company_name, phone, email, address, source)
  values ('John Dsouza', 'Dsouza Auto Care', '+971 50 567 8901', 'john@dsouzaauto.ae', 'Al Quoz, Dubai', 'Instagram')
  returning id into cust_john;

  -- =========================================================================
  -- LEADS
  -- =========================================================================
  insert into leads (customer_id, title, status, requirement_summary)
  values (cust_ahmed, 'Vehicle wrap for delivery fleet', 'converted', '3 delivery vans, full body wrap with new branding')
  returning id into lead_ahmed;

  insert into leads (customer_id, title, status, requirement_summary)
  values (cust_fatima, 'Exhibition stand - upcoming trade show', 'converted', '6x3m modular stand, backlit signage')
  returning id into lead_fatima;

  insert into leads (customer_id, title, status, requirement_summary)
  values (cust_mike, 'Retail branding stickers', 'converted', 'Window decals and product labels for 5 store locations')
  returning id into lead_mike;

  insert into leads (customer_id, title, status, requirement_summary)
  values (cust_mike, 'Second batch - seasonal promo stickers', 'lost', 'Went with a cheaper supplier')
  returning id into lead_mike2;

  insert into leads (customer_id, title, status, requirement_summary)
  values (cust_sara, 'Office signage and banners', 'converted', 'Reception signage + 2 pull-up banners')
  returning id into lead_sara;

  insert into leads (customer_id, title, status, requirement_summary)
  values (cust_john, 'Workshop vehicle wrap', 'converted', 'Single service van, partial wrap')
  returning id into lead_john;

  -- A couple of leads still sitting in the pipeline (not yet quoted)
  insert into leads (customer_id, title, status, requirement_summary)
  values (cust_fatima, 'Follow-up: additional exhibition banners', 'new', 'Asked about pricing for 4 extra roll-up banners');

  insert into leads (customer_id, title, status, requirement_summary)
  values (cust_john, 'Shop front signage enquiry', 'contacted', 'Waiting on site measurements');

  -- =========================================================================
  -- QUOTATION 1 — Ahmed, vehicle wrap, approved -> completed & paid
  -- =========================================================================
  insert into quotations (lead_id, customer_id, status, valid_until, subtotal, discount, tax_percent, tax_amount, total, terms, approved_at, approved_by_name, created_at)
  values (lead_ahmed, cust_ahmed, 'approved', current_date + 15, 8000, 0, 5, 400, 8400, '50% advance, balance on delivery.', now() - interval '150 days', 'Ahmed - Fleet Manager', now() - interval '155 days')
  returning id into quote1;

  insert into quotation_items (quotation_id, product_type, description, material, unit, qty, unit_price, sort_order) values
    (quote1, 'vehicle_wrap', 'Full body wrap - Van 1', 'Cast Vinyl', 'set', 1, 2800, 0),
    (quote1, 'vehicle_wrap', 'Full body wrap - Van 2', 'Cast Vinyl', 'set', 1, 2800, 1),
    (quote1, 'vehicle_wrap', 'Full body wrap - Van 3', 'Cast Vinyl', 'set', 1, 2400, 2);

  -- =========================================================================
  -- QUOTATION 2 — Ahmed repeat order, approved -> completed & paid
  -- =========================================================================
  insert into quotations (customer_id, status, valid_until, subtotal, discount, tax_percent, tax_amount, total, terms, approved_at, approved_by_name, created_at)
  values (cust_ahmed, 'approved', current_date + 20, 2500, 0, 5, 125, 2625, '50% advance, balance on delivery.', now() - interval '55 days', 'Ahmed - Fleet Manager', now() - interval '58 days')
  returning id into quote2;

  insert into quotation_items (quotation_id, product_type, description, material, unit, qty, unit_price, sort_order) values
    (quote2, 'sticker_printing', 'Vinyl Gloss Sticker - fleet decals', 'Vinyl (Gloss)', 'pcs', 500, 5.00, 0);

  -- =========================================================================
  -- QUOTATION 3 — Fatima, exhibition stand, approved -> in production
  -- =========================================================================
  insert into quotations (lead_id, customer_id, status, valid_until, subtotal, discount, tax_percent, tax_amount, total, terms, approved_at, approved_by_name, created_at)
  values (lead_fatima, cust_fatima, 'approved', current_date + 25, 15000, 500, 5, 725, 15225, '50% advance to begin fabrication.', now() - interval '10 days', 'Fatima Hassan', now() - interval '14 days')
  returning id into quote3;

  insert into quotation_items (quotation_id, product_type, description, material, unit, qty, unit_price, sort_order) values
    (quote3, 'exhibition_stand', '6x3m modular exhibition stand', 'Aluminum frame + fabric panels', 'set', 1, 11000, 0),
    (quote3, 'signage', 'Backlit acrylic logo signage', 'Acrylic 10mm', 'sqft', 40, 100, 1);

  -- =========================================================================
  -- QUOTATION 4 — Mike, retail stickers, approved -> pending (not started)
  -- =========================================================================
  insert into quotations (lead_id, customer_id, status, valid_until, subtotal, discount, tax_percent, tax_amount, total, terms, approved_at, approved_by_name, created_at)
  values (lead_mike, cust_mike, 'approved', current_date + 10, 3200, 0, 5, 160, 3360, '50% advance, balance on delivery.', now() - interval '2 days', 'Mike Chen', now() - interval '5 days')
  returning id into quote4;

  insert into quotation_items (quotation_id, product_type, description, material, unit, qty, unit_price, sort_order) values
    (quote4, 'sticker_printing', 'Window decals - 5 store locations', 'Vinyl (Matte)', 'pcs', 400, 5.50, 0),
    (quote4, 'sticker_printing', 'Product labels', 'Vinyl (Gloss)', 'pcs', 200, 5.00, 1);

  -- =========================================================================
  -- QUOTATION 5 — Sara, office signage, approved -> completed & delivered, PARTIALLY paid
  -- =========================================================================
  insert into quotations (lead_id, customer_id, status, valid_until, subtotal, discount, tax_percent, tax_amount, total, terms, approved_at, approved_by_name, created_at)
  values (lead_sara, cust_sara, 'approved', current_date + 12, 6000, 0, 5, 300, 6300, '50% advance, balance on delivery.', now() - interval '25 days', 'Sara Al Mansoori', now() - interval '28 days')
  returning id into quote5;

  insert into quotation_items (quotation_id, product_type, description, material, unit, qty, unit_price, sort_order) values
    (quote5, 'signage', 'Reception signage - acrylic letters', 'Acrylic 15mm', 'set', 1, 4000, 0),
    (quote5, 'large_format', 'Pull-up banner stands', 'Flex 440gsm', 'pcs', 2, 1000, 1);

  -- =========================================================================
  -- QUOTATION 6 — Sara, banners, SENT (awaiting decision)
  -- =========================================================================
  insert into quotations (customer_id, status, valid_until, subtotal, discount, tax_percent, tax_amount, total, terms, created_at)
  values (cust_sara, 'sent', current_date + 14, 1800, 0, 5, 90, 1890, '50% advance, balance on delivery.', now() - interval '3 days')
  returning id into quote6;

  insert into quotation_items (quotation_id, product_type, description, material, unit, qty, unit_price, sort_order) values
    (quote6, 'large_format', 'Outdoor flex banners - site boundary', 'Flex 440gsm', 'sqft', 225, 8.00, 0);

  -- =========================================================================
  -- QUOTATION 7 — John, vehicle wrap, REJECTED
  -- =========================================================================
  insert into quotations (lead_id, customer_id, status, valid_until, subtotal, discount, tax_percent, tax_amount, total, terms, created_at)
  values (lead_john, cust_john, 'rejected', current_date - 5, 2400, 0, 5, 120, 2520, '50% advance, balance on delivery.', now() - interval '20 days')
  returning id into quote7;

  insert into quotation_items (quotation_id, product_type, description, material, unit, qty, unit_price, sort_order) values
    (quote7, 'vehicle_wrap', 'Partial wrap - service van', 'Cast Vinyl', 'set', 1, 2400, 0);

  -- =========================================================================
  -- QUOTATION 8 — Mike, acrylic display stands, DRAFT
  -- =========================================================================
  insert into quotations (customer_id, status, valid_until, subtotal, discount, tax_percent, tax_amount, total, terms, created_at)
  values (cust_mike, 'draft', current_date + 30, 4500, 0, 5, 225, 4725, '50% advance, balance on delivery.', now() - interval '1 day')
  returning id into quote8;

  insert into quotation_items (quotation_id, product_type, description, material, unit, qty, unit_price, sort_order) values
    (quote8, 'acrylic_fabrication', 'Countertop acrylic display stands', 'Acrylic 8mm', 'pcs', 15, 300, 0);

  -- =========================================================================
  -- JOB 1 (from quote1) — Ahmed vehicle wrap — COMPLETED, DELIVERED, PAID
  -- =========================================================================
  insert into job_orders (quotation_id, customer_id, status, priority, due_date, created_at)
  values (quote1, cust_ahmed, 'completed', 'high', current_date - 140, now() - interval '154 days')
  returning id into job1;

  insert into production_orders (job_order_id, stage, status, started_at, completed_at) values
    (job1, 'design',    'completed', now() - interval '153 days', now() - interval '152 days'),
    (job1, 'printing',  'completed', now() - interval '152 days', now() - interval '150 days'),
    (job1, 'cutting',   'completed', now() - interval '150 days', now() - interval '149 days'),
    (job1, 'finishing', 'completed', now() - interval '149 days', now() - interval '148 days'),
    (job1, 'assembly',  'completed', now() - interval '148 days', now() - interval '147 days'),
    (job1, 'ready',     'completed', now() - interval '147 days', now() - interval '146 days');

  insert into quality_checks (job_order_id, passed, remarks, checked_at)
  values (job1, true, 'Wrap alignment and finish checked — no bubbling.', now() - interval '146 days');

  insert into deliveries (job_order_id, status, delivery_date, received_by_name)
  values (job1, 'delivered', current_date - 145, 'Ahmed Al Farsi');

  insert into invoices (job_order_id, customer_id, subtotal, tax_amount, total, due_date, created_at)
  values (job1, cust_ahmed, 8000, 400, 8400, current_date - 130, now() - interval '145 days')
  returning id into inv1;

  insert into payments (invoice_id, amount, method, paid_at)
  values (inv1, 8400, 'bank_transfer', now() - interval '140 days');

  -- =========================================================================
  -- JOB (from quote2) — Ahmed repeat sticker order — COMPLETED, DELIVERED, PAID
  -- =========================================================================
  insert into job_orders (quotation_id, customer_id, status, priority, due_date, created_at)
  values (quote2, cust_ahmed, 'completed', 'normal', current_date - 50, now() - interval '57 days')
  returning id into job2;

  insert into production_orders (job_order_id, stage, status, started_at, completed_at) values
    (job2, 'design',   'completed', now() - interval '56 days', now() - interval '55 days'),
    (job2, 'printing', 'completed', now() - interval '55 days', now() - interval '53 days'),
    (job2, 'cutting',  'completed', now() - interval '53 days', now() - interval '52 days'),
    (job2, 'ready',    'completed', now() - interval '52 days', now() - interval '51 days');

  insert into quality_checks (job_order_id, passed, remarks, checked_at)
  values (job2, true, 'Color match confirmed against previous batch.', now() - interval '51 days');

  insert into deliveries (job_order_id, status, delivery_date, received_by_name)
  values (job2, 'delivered', current_date - 50, 'Ahmed Al Farsi');

  insert into invoices (job_order_id, customer_id, subtotal, tax_amount, total, due_date, created_at)
  values (job2, cust_ahmed, 2500, 125, 2625, current_date - 35, now() - interval '50 days')
  returning id into inv2;

  insert into payments (invoice_id, amount, method, paid_at)
  values (inv2, 2625, 'cash', now() - interval '48 days');

  -- =========================================================================
  -- JOB 3 (from quote3) — Fatima exhibition stand — IN PRODUCTION (active)
  -- =========================================================================
  insert into job_orders (quotation_id, customer_id, status, priority, due_date, created_at)
  values (quote3, cust_fatima, 'in_production', 'urgent', current_date + 5, now() - interval '9 days')
  returning id into job3;

  insert into production_orders (job_order_id, stage, status, started_at, completed_at) values
    (job3, 'design',   'completed', now() - interval '8 days', now() - interval '6 days');
  insert into production_orders (job_order_id, stage, status, started_at) values
    (job3, 'printing', 'in_progress', now() - interval '2 days');

  -- =========================================================================
  -- JOB (from quote4) — Mike retail stickers — PENDING (not started yet)
  -- =========================================================================
  insert into job_orders (quotation_id, customer_id, status, priority, due_date, created_at)
  values (quote4, cust_mike, 'pending', 'normal', current_date + 8, now() - interval '2 days');

  -- =========================================================================
  -- JOB 4 (from quote5) — Sara office signage — COMPLETED, DELIVERED, PARTIALLY PAID
  -- =========================================================================
  insert into job_orders (quotation_id, customer_id, status, priority, due_date, created_at)
  values (quote5, cust_sara, 'completed', 'normal', current_date - 15, now() - interval '27 days')
  returning id into job4;

  insert into production_orders (job_order_id, stage, status, started_at, completed_at) values
    (job4, 'design',    'completed', now() - interval '26 days', now() - interval '25 days'),
    (job4, 'printing',  'completed', now() - interval '25 days', now() - interval '23 days'),
    (job4, 'cutting',   'completed', now() - interval '23 days', now() - interval '22 days'),
    (job4, 'assembly',  'completed', now() - interval '22 days', now() - interval '20 days'),
    (job4, 'ready',     'completed', now() - interval '20 days', now() - interval '19 days');

  insert into quality_checks (job_order_id, passed, remarks, checked_at)
  values (job4, true, 'Signage level and secure. Approved.', now() - interval '19 days');

  insert into deliveries (job_order_id, status, delivery_date, received_by_name)
  values (job4, 'delivered', current_date - 18, 'Sara Al Mansoori');

  insert into invoices (job_order_id, customer_id, subtotal, tax_amount, total, due_date, created_at)
  values (job4, cust_sara, 6000, 300, 6300, current_date + 2, now() - interval '18 days')
  returning id into inv4;

  -- Partial payment only — leaves an outstanding balance for Reports/Invoices to show
  insert into payments (invoice_id, amount, method, paid_at)
  values (inv4, 3000, 'bank_transfer', now() - interval '15 days');

end $$;

-- ============================================================================
-- DONE. This gives you:
--  - 5 customers (Ahmed appears twice — good for "Top Customers" testing)
--  - 8 leads across every status (new, contacted, qualified, converted, lost)
--  - 8 quotations across every status (draft, sent, approved, rejected)
--  - 4 job orders across every status (pending, in_production, completed)
--  - Production stages: some fully completed, one actively in_progress
--    (visible on the Production Board)
--  - Quality checks, deliveries, invoices (one paid, one partial), and
--    payments spread across the last ~5 months for the Reports revenue chart
-- ============================================================================
