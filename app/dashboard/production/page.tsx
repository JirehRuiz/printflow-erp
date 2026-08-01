import { createClient } from "@/lib/supabase/server";
import ProductionBoardClient from "./production-board-client";

export default async function ProductionBoardPage() {
  const supabase = createClient();

  const { data: orders } = await supabase
    .from("production_orders")
    .select(
      "id, stage, status, machine_name, notes, started_at, completed_at, job_order_id, job_orders(job_number, customers(name)), staff(full_name)"
    )
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-brand-900">Production Board</h1>
      <p className="mt-1 text-sm text-gray-500">
        Live view of every active job across the shop floor. Completed stages drop off automatically.
      </p>

      <ProductionBoardClient orders={orders ?? []} />
    </div>
  );
}
