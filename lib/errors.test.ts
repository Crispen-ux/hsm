import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isNextControlFlowError, isUniqueViolation, mapUnknownError } from "@/lib/errors";
import { MoneyRangeError } from "@/lib/money";

describe("mapUnknownError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["P2002", "CONFLICT"],
    ["P2025", "NOT_FOUND"],
    ["P2003", "CONFLICT"],
    ["P1001", "UNAVAILABLE"],
    ["P2024", "UNAVAILABLE"],
    ["P9999", "INTERNAL"],
  ])("maps Prisma %s to %s", (code, expected) => {
    const result = mapUnknownError("test", Object.assign(new Error("db"), { code }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(expected);
    }
  });

  it("maps initialization errors to UNAVAILABLE", () => {
    const error = new Error("cannot connect");
    error.name = "PrismaClientInitializationError";
    const result = mapUnknownError("test", error);
    expect(!result.ok && result.error.code).toBe("UNAVAILABLE");
  });

  it("maps money range errors to VALIDATION", () => {
    const result = mapUnknownError("test", new MoneyRangeError("OVERFLOW", "too big"));
    expect(!result.ok && result.error.code).toBe("VALIDATION");
  });

  it("does not leak internal messages", () => {
    const result = mapUnknownError("test", new Error("password=hunter2 in connection string"));
    expect(!result.ok && result.error.message).not.toContain("hunter2");
    expect(!result.ok && result.error.code).toBe("INTERNAL");
  });

  it("rethrows Next.js control-flow errors", () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/x;307;" });
    const dynamic = Object.assign(new Error("dynamic"), { digest: "DYNAMIC_SERVER_USAGE" });
    expect(() => mapUnknownError("test", redirect)).toThrow(redirect);
    expect(() => mapUnknownError("test", dynamic)).toThrow(dynamic);
  });
});

describe("error predicates", () => {
  it("detects unique violations", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation({ code: "P2025" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
  });

  it("detects Next control flow by digest only", () => {
    expect(isNextControlFlowError({ digest: "NEXT_NOT_FOUND" })).toBe(true);
    expect(isNextControlFlowError({ digest: "12345" })).toBe(false);
    expect(isNextControlFlowError(new Error("x"))).toBe(false);
  });
});
