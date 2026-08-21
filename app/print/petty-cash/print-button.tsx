"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-brand-600 hover:text-white"
    >
      🖨️ Print / Save as PDF
    </button>
  );
}
