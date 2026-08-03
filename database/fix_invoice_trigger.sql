-- ============================================================================
-- Fix: sync_invoice_payment_status() was comparing plain text against the
-- invoice_status enum column, which Postgres doesn't always auto-cast inside
-- a CASE expression. This adds explicit ::invoice_status casts.
-- ============================================================================

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
        when v_total_paid <= 0 then 'unpaid'::invoice_status
        when v_total_paid >= v_invoice_total then 'paid'::invoice_status
        else 'partial'::invoice_status
      end,
      updated_at = now()
  where id = v_invoice_id;

  return null;
end;
$$ language plpgsql;
