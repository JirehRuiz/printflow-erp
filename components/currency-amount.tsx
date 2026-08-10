import { formatNumber } from "@/lib/constants";

export default function CurrencyAmount({
  amount,
  className = "",
}: {
  amount: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/currency-symbol.png"
        alt="AED"
        className="h-[0.8em] w-auto translate-y-[0.05em] opacity-90"
      />
      {formatNumber(amount)}
    </span>
  );
}
