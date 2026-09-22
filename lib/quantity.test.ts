import { describe, expect, it } from "vitest";
import { centsToRandsString, formatMilli, parseQuantityToMilli } from "@/lib/quantity";

describe("parseQuantityToMilli", () => {
  it.each([
    ["1", "EACH", 1_000],
    ["12", "EACH", 12_000],
    ["1000", "EACH", 1_000_000],
    ["13.875", "SQM", 13_875],
    ["13,875", "SQM", 13_875],
    ["28.3", "SQM", 28_300],
    ["28", "SQM", 28_000],
    ["0.001", "SQM", 1],
    [" 133 ", "SQM", 133_000],
  ] as const)("parses %s (%s) as %s milli", (input, unit, expected) => {
    expect(parseQuantityToMilli(input, unit)).toBe(expected);
  });

  it.each([
    ["", "EACH"],
    ["0", "EACH"],
    ["1.5", "EACH"],
    ["1001", "EACH"],
    ["abc", "SQM"],
    ["1.2345", "SQM"],
    ["-3", "SQM"],
    ["0", "SQM"],
    ["10000", "SQM"],
  ] as const)("rejects %s (%s)", (input, unit) => {
    expect(parseQuantityToMilli(input, unit)).toBeNull();
  });
});

describe("formatMilli and centsToRandsString", () => {
  it("round-trips area values", () => {
    for (const milli of [13_875, 28_300, 133_000, 1, 500]) {
      expect(parseQuantityToMilli(formatMilli(milli, "SQM"), "SQM")).toBe(milli);
    }
  });

  it("formats whole and fractional amounts", () => {
    expect(formatMilli(28_300, "SQM")).toBe("28.3");
    expect(formatMilli(28_000, "SQM")).toBe("28");
    expect(formatMilli(3_000, "EACH")).toBe("3");
  });

  it("converts cents to a rands string without floats", () => {
    expect(centsToRandsString(520_000)).toBe("5200.00");
    expect(centsToRandsString(5)).toBe("0.05");
    expect(centsToRandsString(12_345)).toBe("123.45");
  });
});
