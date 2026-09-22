import { describe, expect, it } from "vitest";
import {
  MoneyRangeError,
  addCents,
  computeInvoiceTotals,
  divRoundHalfUp,
  formatZar,
  lineTotalCentsForQuantity,
  parseRandsToCents,
  splitZar,
  vatFromExclusive,
  vatFromInclusive,
} from "@/lib/money";

describe("divRoundHalfUp", () => {
  it.each([
    [5n, 2n, 3n],
    [4n, 3n, 1n],
    [5n, 3n, 2n],
    [1n, 3n, 0n],
    [0n, 7n, 0n],
    [10n, 4n, 3n],
  ])("%s / %s rounds half up to %s", (numerator, denominator, expected) => {
    expect(divRoundHalfUp(numerator, denominator)).toBe(expected);
  });

  it("rejects non-positive denominators and negative numerators", () => {
    expect(() => divRoundHalfUp(1n, 0n)).toThrow(RangeError);
    expect(() => divRoundHalfUp(-1n, 2n)).toThrow(RangeError);
  });
});

describe("vat", () => {
  it("computes 15% exactly for the Full tier", () => {
    expect(vatFromExclusive(520_000)).toBe(78_000);
  });

  it("rounds half up", () => {
    expect(vatFromExclusive(10)).toBe(2);
    expect(vatFromExclusive(12_345)).toBe(1_852);
    expect(vatFromExclusive(0)).toBe(0);
  });

  it("extracts VAT from an inclusive amount", () => {
    expect(vatFromInclusive(115_00)).toBe(15_00);
  });
});

describe("lineTotalCentsForQuantity", () => {
  it.each([
    [12_345, 13_875, 171_287],
    [10_000, 13_900, 139_000],
    [10_000, 1_000, 10_000],
    [99_999, 500, 50_000],
    [1, 1, 0],
    [1, 500, 1],
    [520_000, 1_000, 520_000],
  ])("unit %s x qty %s milli = %s cents", (unit, quantity, expected) => {
    expect(lineTotalCentsForQuantity(unit, quantity)).toBe(expected);
  });

  it("rejects fractional or negative inputs", () => {
    expect(() => lineTotalCentsForQuantity(10.5, 1_000)).toThrow(MoneyRangeError);
    expect(() => lineTotalCentsForQuantity(100, -1)).toThrow(MoneyRangeError);
  });
});

describe("computeInvoiceTotals", () => {
  it("computes a single Full tier invoice", () => {
    const totals = computeInvoiceTotals([{ unitPriceCents: 520_000, quantityMilli: 1_000 }], 50_000);
    expect(totals).toEqual({
      lineTotals: [520_000],
      subtotalCents: 520_000,
      vatCents: 78_000,
      totalCents: 598_000,
      depositCents: 50_000,
      balanceCents: 548_000,
    });
  });

  it("applies VAT once on the subtotal", () => {
    const totals = computeInvoiceTotals(
      [
        { unitPriceCents: 333, quantityMilli: 1_000 },
        { unitPriceCents: 333, quantityMilli: 1_000 },
        { unitPriceCents: 333, quantityMilli: 1_000 },
      ],
      0,
    );
    expect(totals.subtotalCents).toBe(999);
    expect(totals.vatCents).toBe(150);
    expect(totals.totalCents).toBe(1_149);
  });

  it("rejects a deposit above the total", () => {
    expect(() => computeInvoiceTotals([{ unitPriceCents: 1_000, quantityMilli: 1_000 }], 5_000)).toThrow(
      MoneyRangeError,
    );
  });

  it("rejects totals beyond the database integer range", () => {
    expect(() =>
      computeInvoiceTotals([{ unitPriceCents: 2_000_000_000, quantityMilli: 2_000 }], 0),
    ).toThrow(MoneyRangeError);
  });

  it("adds cents without drift", () => {
    expect(addCents(10, 20, 30)).toBe(60);
    expect(() => addCents(0.1, 0.2)).toThrow(MoneyRangeError);
  });
});

describe("formatZar", () => {
  it("formats with grouping and comma decimals", () => {
    expect(formatZar(520_000)).toBe("R5\u00A0200,00");
    expect(formatZar(5)).toBe("R0,05");
    expect(formatZar(123_456_789)).toBe("R1\u00A0234\u00A0567,89");
    expect(formatZar(-2_550)).toBe("-R25,50");
  });
});

describe("parseRandsToCents", () => {
  it.each([
    ["5200", 520_000],
    ["R5 200", 520_000],
    ["R5,200", 520_000],
    ["5 200,50", 520_050],
    ["R5200.5", 520_050],
    ["12.34", 1_234],
    ["500 rand", 50_000],
    ["10 000", 1_000_000],
  ])("parses %s", (input, expected) => {
    expect(parseRandsToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1e3", "999999999999"])("rejects %s", (input) => {
    expect(parseRandsToCents(input)).toBeNull();
  });
});

describe("splitZar", () => {
  it("splits an amount for display", () => {
    expect(splitZar(520_000)).toEqual({ symbol: "R", whole: "5\u00A0200", cents: "00" });
    expect(splitZar(5)).toEqual({ symbol: "R", whole: "0", cents: "05" });
    expect(splitZar(123_456_789)).toEqual({ symbol: "R", whole: "1\u00A0234\u00A0567", cents: "89" });
  });

  it("rejects negative and fractional input", () => {
    expect(() => splitZar(-1)).toThrow(MoneyRangeError);
    expect(() => splitZar(1.5)).toThrow(MoneyRangeError);
  });
});
