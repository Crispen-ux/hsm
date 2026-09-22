import { describe, expect, it } from "vitest";
import { normalizeSaPhone } from "@/lib/phone";

describe("normalizeSaPhone", () => {
  it.each([
    ["0821234567", "+27821234567"],
    ["+27 82 123 4567", "+27821234567"],
    ["27821234567", "+27821234567"],
    ["082-123-4567", "+27821234567"],
    ["(011) 234 5678", "+27112345678"],
    ["0027821234567", "+27821234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeSaPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "0921234567", "+44 7700 900123", "082123456", "08212345678", "abc"])(
    "rejects %s",
    (input) => {
      expect(normalizeSaPhone(input)).toBeNull();
    },
  );
});
