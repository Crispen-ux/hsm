import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, type RateLimitRule } from "@/lib/rate-limit";

const rule: RateLimitRule = { name: "test", limit: 3, windowSeconds: 600 };
const now = new Date("2026-03-01T10:00:00.000Z");

function fakeClient(rows: Array<{ count: number; window_start: Date }>) {
  const queryRaw = vi.fn().mockResolvedValue(rows);
  return { client: { $queryRaw: queryRaw } as unknown as Pick<PrismaClient, "$queryRaw">, queryRaw };
}

describe("checkRateLimit", () => {
  it("allows requests up to the limit", async () => {
    const { client } = fakeClient([{ count: 3, window_start: now }]);
    const result = await checkRateLimit(client, rule, "abc", now);
    expect(result).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 600 });
  });

  it("blocks requests over the limit and reports retry time", async () => {
    const windowStart = new Date(now.getTime() - 100_000);
    const { client } = fakeClient([{ count: 4, window_start: windowStart }]);
    const result = await checkRateLimit(client, rule, "abc", now);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBe(500);
  });

  it("namespaces the bucket key and passes the window cutoff", async () => {
    const { client, queryRaw } = fakeClient([{ count: 1, window_start: now }]);
    await checkRateLimit(client, rule, "abc", now);
    const values = queryRaw.mock.calls[0]?.slice(1) as unknown[];
    expect(values[0]).toBe("test:abc");
    expect(values).toContainEqual(new Date(now.getTime() - 600_000));
  });

  it("fails loudly if the database returns no row", async () => {
    const { client } = fakeClient([]);
    await expect(checkRateLimit(client, rule, "abc", now)).rejects.toThrow();
  });
});
