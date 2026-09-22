import type { LineUnit } from "@/lib/domain";

const MAX_QUANTITY_MILLI = 1_000_000;

export function parseQuantityToMilli(input: string, unit: LineUnit): number | null {
  const cleaned = input.trim().replace(",", ".").replace(/\s/g, "");

  if (unit === "EACH") {
    if (!/^\d{1,4}$/.test(cleaned)) {
      return null;
    }
    const count = Number(cleaned);
    return count >= 1 && count <= 1000 ? count * 1000 : null;
  }

  if (!/^\d{1,4}(\.\d{1,3})?$/.test(cleaned)) {
    return null;
  }
  const [whole = "0", fraction = ""] = cleaned.split(".");
  const milli = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  return milli >= 1 && milli <= MAX_QUANTITY_MILLI ? milli : null;
}

export function formatMilli(milli: number, unit: LineUnit): string {
  const whole = Math.floor(milli / 1000);
  const fraction = milli % 1000;
  if (fraction === 0) {
    return String(whole);
  }
  const trimmed = String(fraction).padStart(3, "0").replace(/0+$/, "");
  return unit === "EACH" ? `${whole}.${String(fraction).padStart(3, "0")}` : `${whole}.${trimmed}`;
}

export function centsToRandsString(cents: number): string {
  const rands = Math.floor(cents / 100);
  return `${rands}.${String(cents % 100).padStart(2, "0")}`;
}
