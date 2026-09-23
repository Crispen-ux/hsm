export const MAX_CENTS = 2_147_483_647;

export type MoneyErrorCode = "NOT_INTEGER" | "NEGATIVE" | "OVERFLOW" | "DEPOSIT_EXCEEDS_TOTAL";

export class MoneyRangeError extends RangeError {
  readonly code: MoneyErrorCode;

  constructor(code: MoneyErrorCode, message: string) {
    super(message);
    this.name = "MoneyRangeError";
    this.code = code;
  }
}

export interface PricedLine {
  unitPriceCents: number;
  quantityMilli: number;
}

export interface InvoiceTotals {
  lineTotals: number[];
  subtotalCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
}

function toBigIntStrict(value: number, label: string): bigint {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyRangeError("NOT_INTEGER", `${label} must be a safe integer`);
  }
  if (value < 0) {
    throw new MoneyRangeError("NEGATIVE", `${label} must not be negative`);
  }
  return BigInt(value);
}

function toCents(value: bigint): number {
  if (value > BigInt(MAX_CENTS)) {
    throw new MoneyRangeError("OVERFLOW", "Amount exceeds the maximum storable value");
  }
  return Number(value);
}

export function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new RangeError("Denominator must be positive");
  }
  if (numerator < 0n) {
    throw new RangeError("Numerator must not be negative");
  }
  return (2n * numerator + denominator) / (2n * denominator);
}

export function addCents(...amounts: number[]): number {
  let total = 0n;
  for (const amount of amounts) {
    total += toBigIntStrict(amount, "amount");
  }
  return toCents(total);
}

export function lineTotalCentsForQuantity(unitPriceCents: number, quantityMilli: number): number {
  const unit = toBigIntStrict(unitPriceCents, "unitPriceCents");
  const quantity = toBigIntStrict(quantityMilli, "quantityMilli");
  return toCents(divRoundHalfUp(unit * quantity, 1000n));
}

export function computeInvoiceTotals(lines: readonly PricedLine[], depositCents: number): InvoiceTotals {
  const lineTotals = lines.map((line) => lineTotalCentsForQuantity(line.unitPriceCents, line.quantityMilli));
  const subtotalCents = addCents(...lineTotals);
  const totalCents = subtotalCents;
  const deposit = toCents(toBigIntStrict(depositCents, "depositCents"));

  if (deposit > totalCents) {
    throw new MoneyRangeError("DEPOSIT_EXCEEDS_TOTAL", "Deposit exceeds invoice total");
  }

  return {
    lineTotals,
    subtotalCents,
    totalCents,
    depositCents: deposit,
    balanceCents: totalCents - deposit,
  };
}

export function formatZar(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new MoneyRangeError("NOT_INTEGER", "cents must be a safe integer");
  }
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const rands = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const grouped = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${negative ? "-" : ""}R${grouped},${String(remainder).padStart(2, "0")}`;
}

const MAX_RAND_DIGITS = 8;

export function parseRandsToCents(input: string): number | null {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^r(?:ands?)?\s*/, "")
    .replace(/\s*rands?$/, "")
    .replace(/[\s\u00A0]/g, "");

  if (!/^\d[\d.,]*$/.test(cleaned)) {
    return null;
  }

  const separatorIndex = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  let randsPart = cleaned;
  let centsPart = "00";

  if (separatorIndex !== -1) {
    const fraction = cleaned.slice(separatorIndex + 1);
    if (fraction.length >= 1 && fraction.length <= 2) {
      randsPart = cleaned.slice(0, separatorIndex);
      centsPart = fraction.padEnd(2, "0");
    }
  }

  const randsDigits = randsPart.replace(/[.,]/g, "");
  if (!/^\d+$/.test(randsDigits) || randsDigits.length > MAX_RAND_DIGITS) {
    return null;
  }

  const cents = Number(randsDigits) * 100 + Number(centsPart);
  return cents <= MAX_CENTS ? cents : null;
}

export interface ZarParts {
  symbol: "R";
  whole: string;
  cents: string;
}

export function splitZar(cents: number): ZarParts {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new MoneyRangeError("NOT_INTEGER", "cents must be a non-negative safe integer");
  }
  const rands = Math.floor(cents / 100);
  return {
    symbol: "R",
    whole: String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"),
    cents: String(cents % 100).padStart(2, "0"),
  };
}
