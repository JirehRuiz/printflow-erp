select
  i.invoice_number,
  i.total as invoice_total,
  i.created_at as invoice_date,
  q.quote_number,
  coalesce(sum(qi.qty * qi.cost_price), 0) as total_cogs_for_this_invoice
from invoices i
join job_orders jo on jo.id = i.job_order_id
join quotations q on q.id = jo.quotation_id
left join quotation_items qi on qi.quotation_id = q.id
group by i.invoice_number, i.total, i.created_at, q.quote_number
order by i.created_at desc;
