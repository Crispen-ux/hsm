import { createHmac } from "node:crypto";

interface HeaderReader {
  get(name: string): string | null;
}

const IP_PATTERN = /^[0-9a-fA-F:.]{3,45}$/;

export function extractClientIp(headers: HeaderReader): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded && IP_PATTERN.test(forwarded)) {
    return forwarded;
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real && IP_PATTERN.test(real)) {
    return real;
  }
  return "unknown";
}

export function hashIdentifier(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}
