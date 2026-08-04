-- Run this in Supabase SQL Editor to see exactly what cost data (if any)
-- is stored behind your invoiced jobs.

select
  i.invoice_number,
  i.total as invoice_total,
  i.created_at as invoice_date,
  q.quote_number,
  qi.description,
  qi.qty,
  qi.unit_price,
  qi.cost_price,
  (qi.qty * qi.cost_price) as line_cogs
from invoices i
join job_orders jo on jo.id = i.job_order_id
join quotations q on q.id = jo.quotation_id
join quotation_items qi on qi.quotation_id = q.id
order by i.created_at desc;
