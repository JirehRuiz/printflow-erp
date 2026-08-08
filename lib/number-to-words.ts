const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function threeDigitsToWords(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

function integerToWords(n: number): string {
  if (n === 0) return "Zero";

  const groups = [
    { value: 1_000_000_000, label: "Billion" },
    { value: 1_000_000, label: "Million" },
    { value: 1_000, label: "Thousand" },
    { value: 1, label: "" },
  ];

  let remainder = n;
  const parts: string[] = [];

  for (const group of groups) {
    const count = Math.floor(remainder / group.value);
    if (count > 0) {
      parts.push(`${threeDigitsToWords(count)}${group.label ? " " + group.label : ""}`);
      remainder %= group.value;
    }
  }

  return parts.join(" ").trim();
}

/**
 * Converts a currency amount to words, AED-style, e.g.
 * 1300 -> "One Thousand Three Hundred Dirhams Only"
 * 1250.50 -> "One Thousand Two Hundred Fifty Dirhams and Fifty Fils Only"
 */
export function amountToWordsAED(amount: number): string {
  const dirhams = Math.floor(amount);
  const fils = Math.round((amount - dirhams) * 100);

  let result = `${integerToWords(dirhams)} Dirham${dirhams === 1 ? "" : "s"}`;
  if (fils > 0) {
    result += ` and ${integerToWords(fils)} Fils`;
  }
  result += " Only";

  return result.toUpperCase();
}
