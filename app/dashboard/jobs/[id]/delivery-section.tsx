"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Delivery = {
  id: string;
  status: string;
  delivery_date: string | null;
  received_by_name: string | null;
} | null;

export default function DeliverySection({
  jobOrderId,
  delivery,
}: {
  jobOrderId: string;
  delivery: Delivery;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [receivedBy, setReceivedBy] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function markReady() {
    setLoading("ready");
    await supabase.from("deliveries").insert({
      job_order_id: jobOrderId,
      status: "ready",
    });
    setLoading(null);
    router.refresh();
  }

  async function updateStatus(id: string, status: string, extra: Record<string, any> = {}) {
    setLoading(status);
    await supabase.from("deliveries").update({ status, ...extra }).eq("id", id);
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Delivery</h2>

      {!delivery && (
        <button
          onClick={markReady}
          disabled={!!loading}
          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {loading === "ready" ? "Saving..." : "Mark Ready for Delivery"}
        </button>
      )}

      {delivery?.status === "ready" && (
        <button
          onClick={() => updateStatus(delivery.id, "dispatched")}
          disabled={!!loading}
          className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {loading === "dispatched" ? "Saving..." : "Mark Dispatched"}
        </button>
      )}

      {delivery?.status === "dispatched" && (
        <div className="space-y-3">
          <input
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            placeholder="Received by (name)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() =>
              updateStatus(delivery.id, "delivered", {
                received_by_name: receivedBy,
                delivery_date: new Date().toISOString().split("T")[0],
              })
            }
            disabled={!!loading}
            className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading === "delivered" ? "Saving..." : "✓ Mark Delivered"}
          </button>
        </div>
      )}

      {delivery?.status === "delivered" && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Delivered {delivery.delivery_date ? `on ${new Date(delivery.delivery_date).toLocaleDateString()}` : ""}
          {delivery.received_by_name ? ` · Received by ${delivery.received_by_name}` : ""}
        </p>
      )}
    </div>
  );
}
