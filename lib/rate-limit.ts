import type { PrismaClient } from "@prisma/client";

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface BucketRow {
  count: number;
  window_start: Date;
}

export const LEAD_SUBMIT_RULE: RateLimitRule = { name: "lead-submit", limit: 5, windowSeconds: 900 };
export const LOGIN_IP_RULE: RateLimitRule = { name: "login-ip", limit: 10, windowSeconds: 900 };
export const LOGIN_ACCOUNT_RULE: RateLimitRule = { name: "login-account", limit: 5, windowSeconds: 900 };
export const INVOICE_WRITE_RULE: RateLimitRule = { name: "invoice-write", limit: 30, windowSeconds: 600 };

export async function checkRateLimit(
  client: Pick<PrismaClient, "$queryRaw">,
  rule: RateLimitRule,
  identifier: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const key = `${rule.name}:${identifier}`;
  const cutoff = new Date(now.getTime() - rule.windowSeconds * 1000);

  const rows = await client.$queryRaw<BucketRow[]>`
    INSERT INTO "rate_limit_buckets" ("key", "count", "window_start")
    VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit_buckets"."window_start" <= ${cutoff} THEN 1
        ELSE "rate_limit_buckets"."count" + 1
      END,
      "window_start" = CASE
        WHEN "rate_limit_buckets"."window_start" <= ${cutoff} THEN ${now}
        ELSE "rate_limit_buckets"."window_start"
      END
    RETURNING "count", "window_start"
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("Rate limit bucket update returned no row");
  }

  const windowEnd = row.window_start.getTime() + rule.windowSeconds * 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowEnd - now.getTime()) / 1000));

  return {
    allowed: row.count <= rule.limit,
    remaining: Math.max(0, rule.limit - row.count),
    retryAfterSeconds,
  };
}

export async function purgeExpiredBuckets(
  client: Pick<PrismaClient, "rateLimitBucket">,
  olderThan: Date,
): Promise<number> {
  const result = await client.rateLimitBucket.deleteMany({ where: { windowStart: { lt: olderThan } } });
  return result.count;
}
