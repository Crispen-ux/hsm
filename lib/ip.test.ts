import { describe, expect, it } from "vitest";
import { extractClientIp, hashIdentifier } from "@/lib/ip";

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe("extractClientIp", () => {
  it("uses the first forwarded address", () => {
    expect(extractClientIp(headers({ "x-forwarded-for": "41.0.0.1, 10.0.0.2" }))).toBe("41.0.0.1");
  });

  it("falls back to x-real-ip and then unknown", () => {
    expect(extractClientIp(headers({ "x-real-ip": "41.0.0.9" }))).toBe("41.0.0.9");
    expect(extractClientIp(headers({}))).toBe("unknown");
  });

  it("rejects malformed values", () => {
    expect(extractClientIp(headers({ "x-forwarded-for": "<script>" }))).toBe("unknown");
    expect(extractClientIp(headers({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });
});

describe("hashIdentifier", () => {
  it("is deterministic, secret-dependent and does not expose the input", () => {
    const first = hashIdentifier("41.0.0.1", "secret-one-secret-one-secret-one!!");
    expect(first).toBe(hashIdentifier("41.0.0.1", "secret-one-secret-one-secret-one!!"));
    expect(first).not.toBe(hashIdentifier("41.0.0.1", "secret-two-secret-two-secret-two!!"));
    expect(first).toHaveLength(32);
    expect(first).not.toContain("41");
  });
});
