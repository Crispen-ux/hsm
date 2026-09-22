import { describe, expect, it } from "vitest";
import { checkTransition } from "@/lib/invoice-status";

describe("checkTransition", () => {
  it.each([
    ["DRAFT", "ISSUED", "CREW", "ALLOWED"],
    ["DRAFT", "VOID", "CREW", "ALLOWED"],
    ["ISSUED", "PAID", "CREW", "ALLOWED"],
    ["ISSUED", "VOID", "CREW", "ALLOWED"],
    ["PAID", "VOID", "ADMIN", "ALLOWED"],
    ["PAID", "VOID", "CREW", "FORBIDDEN"],
    ["DRAFT", "PAID", "ADMIN", "INVALID"],
    ["PAID", "ISSUED", "ADMIN", "INVALID"],
    ["VOID", "DRAFT", "ADMIN", "INVALID"],
    ["ISSUED", "ISSUED", "ADMIN", "INVALID"],
  ] as const)("%s to %s as %s is %s", (from, to, role, expected) => {
    expect(checkTransition(from, to, role)).toBe(expected);
  });
});
