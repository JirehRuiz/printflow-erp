"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/constants";

type Design = {
  id: string;
  name: string;
  panelWidth: string; // cm
  panelLength: string; // cm
  qtySets: string;
  installHours: string;
  designFee: string;
};

const emptyDesign = (): Design => ({
  id: Math.random().toString(36).slice(2),
  name: "",
  panelWidth: "",
  panelLength: "",
  qtySets: "1",
  installHours: "0",
  designFee: "0",
});

type ComputedDesign = {
  design: Design;
  orientation: "A" | "B";
  optimizedLengthPerSet: number;
  seams: number;
  totalLengthNeeded: number;
  printAreaSqm: number;
  materialCost: number;
  inkCost: number;
  laborCost: number;
  subtotal: number;
  overhead: number;
  totalCost: number; // material+ink+labor+designFee+overhead — the true cost basis
  sellPrice: number; // totalCost with margin applied
};

export type RollCalculatorItem = {
  description: string;
  qty: string;
  unit: string;
  unit_price: string;
  cost_price: string;
};

function num(v: string) {
  return parseFloat(v) || 0;
}

export default function RollCalculator({
  canSeeCost,
  onAddItems,
}: {
  canSeeCost: boolean;
  onAddItems: (items: RollCalculatorItem[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const [rollWidth, setRollWidth] = useState("127");
  const [rollLength, setRollLength] = useState("5000");
  const [overlap, setOverlap] = useState("2.5");
  const [pricePerRoll, setPricePerRoll] = useState("500");
  const [inkRate, setInkRate] = useState("15");
  const [laborRate, setLaborRate] = useState("40");
  const [overheadPct, setOverheadPct] = useState("10");
  const [marginPct, setMarginPct] = useState("30");

  const [designs, setDesigns] = useState<Design[]>([emptyDesign()]);

  function updateDesign(id: string, field: keyof Design, value: string) {
    setDesigns((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }
  function addDesign() {
    setDesigns((prev) => [...prev, emptyDesign()]);
  }
  function removeDesign(id: string) {
    setDesigns((prev) => prev.filter((d) => d.id !== id));
  }

  const pricePerCm = num(rollLength) > 0 ? num(pricePerRoll) / num(rollLength) : 0;

  const computed: ComputedDesign[] = useMemo(() => {
    const rw = num(rollWidth);
    const ov = num(overlap);
    const denom = rw - ov;

    return designs
      .filter((d) => d.name && num(d.panelWidth) > 0 && num(d.panelLength) > 0)
      .map((d) => {
        const pw = num(d.panelWidth);
        const pl = num(d.panelLength);
        const qty = num(d.qtySets) || 1;

        const stripsA = pw <= rw ? 1 : denom > 0 ? Math.ceil((pw - rw) / denom) + 1 : 1;
        const lengthA = stripsA * pl;
        const stripsB = pl <= rw ? 1 : denom > 0 ? Math.ceil((pl - rw) / denom) + 1 : 1;
        const lengthB = stripsB * pw;

        let orientation: "A" | "B";
        if (lengthA < lengthB) orientation = "A";
        else if (lengthB < lengthA) orientation = "B";
        else orientation = stripsA <= stripsB ? "A" : "B";

        const optimizedLengthPerSet = orientation === "A" ? lengthA : lengthB;
        const seams = (orientation === "A" ? stripsA : stripsB) - 1;
        const totalLengthNeeded = optimizedLengthPerSet * qty;

        const materialCost = totalLengthNeeded * pricePerCm;
        const printAreaSqm = (totalLengthNeeded * rw) / 10000;
        const inkCost = printAreaSqm * num(inkRate);
        const laborCost = num(d.installHours) * num(laborRate);
        const subtotal = materialCost + inkCost + laborCost + num(d.designFee);
        const overhead = subtotal * (num(overheadPct) / 100);
        const totalCost = subtotal + overhead;
        const sellPrice = totalCost * (1 + num(marginPct) / 100);

        return {
          design: d,
          orientation,
          optimizedLengthPerSet,
          seams,
          totalLengthNeeded,
          printAreaSqm,
          materialCost,
          inkCost,
          laborCost,
          subtotal,
          overhead,
          totalCost,
          sellPrice,
        };
      });
  }, [designs, rollWidth, overlap, pricePerCm, inkRate, laborRate, overheadPct, marginPct]);

  const totals = useMemo(() => {
    const totalLength = computed.reduce((s, c) => s + c.totalLengthNeeded, 0);
    const rollLen = num(rollLength);
    return {
      material: computed.reduce((s, c) => s + c.materialCost, 0),
      ink: computed.reduce((s, c) => s + c.inkCost, 0),
      labor: computed.reduce((s, c) => s + c.laborCost, 0),
      designFees: computed.reduce((s, c) => s + num(c.design.designFee), 0),
      totalCost: computed.reduce((s, c) => s + c.totalCost, 0),
      sellPrice: computed.reduce((s, c) => s + c.sellPrice, 0),
      installHours: computed.reduce((s, c) => s + num(c.design.installHours), 0),
      totalLength,
      rollsRequired: rollLen > 0 ? Math.ceil(totalLength / rollLen) : 0,
      leftover: rollLen > 0 ? Math.ceil(totalLength / rollLen) * rollLen - totalLength : 0,
    };
  }, [computed, rollLength]);

  function handleAddToQuotation() {
    const items: RollCalculatorItem[] = computed.map((c) => ({
      description: `${c.design.name} (${c.design.panelWidth}cm × ${c.design.panelLength}cm)`,
      qty: c.design.qtySets,
      unit: "set",
      unit_price: c.sellPrice.toFixed(2),
      cost_price: c.totalCost.toFixed(2),
    }));
    onAddItems(items);
    setDesigns([emptyDesign()]);
    setOpen(false);
  }

  return (
    <div className="rounded-xl border border-gray-200/70 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-800">
            📐 Roll / Sticker Material Calculator
          </h2>
          <p className="text-xs text-gray-400">
            Works out roll consumption, seams, and cost automatically — then adds line items for you.
          </p>
        </div>
        <span className="text-gray-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5">
          {/* Roll & pricing inputs */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Roll Width (cm)</label>
              <input
                type="number"
                value={rollWidth}
                onChange={(e) => setRollWidth(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Roll Length (cm)</label>
              <input
                type="number"
                value={rollLength}
                onChange={(e) => setRollLength(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Overlap/Seam (cm)</label>
              <input
                type="number"
                value={overlap}
                onChange={(e) => setOverlap(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Price per Roll</label>
              <input
                type="number"
                value={pricePerRoll}
                onChange={(e) => setPricePerRoll(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Ink Rate (per sqm)</label>
              <input
                type="number"
                value={inkRate}
                onChange={(e) => setInkRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Labor Rate (per hr)</label>
              <input
                type="number"
                value={laborRate}
                onChange={(e) => setLaborRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            {canSeeCost && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Overhead %</label>
                  <input
                    type="number"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-magenta-600">
                    Profit Margin %
                  </label>
                  <input
                    type="number"
                    value={marginPct}
                    onChange={(e) => setMarginPct(e.target.value)}
                    className="w-full rounded-lg border border-magenta-500/30 bg-magenta-50/30 px-2 py-1.5 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {/* Designs */}
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Designs / Panels
            </h3>
            <button
              type="button"
              onClick={addDesign}
              className="rounded-lg border border-brand-500 px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
            >
              + Add Design
            </button>
          </div>

          <div className="space-y-3">
            {designs.map((d) => {
              const result = computed.find((c) => c.design.id === d.id);
              return (
                <div key={d.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Design Name
                      </label>
                      <input
                        value={d.name}
                        onChange={(e) => updateDesign(d.id, "name", e.target.value)}
                        placeholder="e.g. Stage Backdrop"
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Panel W (cm)
                      </label>
                      <input
                        type="number"
                        value={d.panelWidth}
                        onChange={(e) => updateDesign(d.id, "panelWidth", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Panel L (cm)
                      </label>
                      <input
                        type="number"
                        value={d.panelLength}
                        onChange={(e) => updateDesign(d.id, "panelLength", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Qty (sets)</label>
                      <input
                        type="number"
                        value={d.qtySets}
                        onChange={(e) => updateDesign(d.id, "qtySets", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Install Hrs
                      </label>
                      <input
                        type="number"
                        value={d.installHours}
                        onChange={(e) => updateDesign(d.id, "installHours", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Design Fee
                      </label>
                      <input
                        type="number"
                        value={d.designFee}
                        onChange={(e) => updateDesign(d.id, "designFee", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    {result && (
                      <>
                        <div className="col-span-2 flex flex-col justify-end text-xs text-gray-500">
                          Orientation <strong>{result.orientation}</strong> · {result.seams} seam
                          {result.seams !== 1 ? "s" : ""} · {result.totalLengthNeeded.toFixed(0)}cm needed
                        </div>
                        {canSeeCost && (
                          <div className="col-span-1 flex flex-col justify-end text-xs text-gray-500">
                            Cost: {formatCurrency(result.totalCost)}
                          </div>
                        )}
                        <div className="col-span-2 flex flex-col justify-end text-sm font-semibold text-brand-700">
                          Suggested price: {formatCurrency(result.sellPrice)}
                        </div>
                      </>
                    )}
                    <div className="flex items-end justify-end">
                      {designs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDesign(d.id)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          {computed.length > 0 && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-gray-400">Total Length Needed</p>
                  <p className="tabular-nums font-medium text-gray-800">
                    {totals.totalLength.toFixed(0)} cm
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Rolls Required</p>
                  <p className="tabular-nums font-medium text-gray-800">{totals.rollsRequired}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Leftover</p>
                  <p className="tabular-nums font-medium text-gray-800">
                    {totals.leftover.toFixed(0)} cm
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-400">Install Hours</p>
                  <p className="tabular-nums font-medium text-gray-800">{totals.installHours}</p>
                </div>
              </div>

              {canSeeCost && (
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-gray-400">Material</p>
                    <p className="tabular-nums text-gray-600">{formatCurrency(totals.material)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Ink</p>
                    <p className="tabular-nums text-gray-600">{formatCurrency(totals.ink)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Labor</p>
                    <p className="tabular-nums text-gray-600">{formatCurrency(totals.labor)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Total Cost</p>
                    <p className="tabular-nums font-semibold text-magenta-600">
                      {formatCurrency(totals.totalCost)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                <div>
                  <p className="text-xs uppercase text-gray-400">Suggested Quotation Total</p>
                  <p className="font-display text-xl font-semibold text-ink-900">
                    {formatCurrency(totals.sellPrice)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddToQuotation}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-600 hover:text-white"
                >
                  Add {computed.length} Item{computed.length !== 1 ? "s" : ""} to Quotation ↓
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
