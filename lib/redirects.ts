const DEFAULT_DESTINATION = "/dashboard";
const MAX_LENGTH = 200;
const PLACEHOLDER_ORIGIN = "http://placeholder.invalid";

export function safeDashboardRedirect(candidate: unknown): string {
  if (typeof candidate !== "string" || candidate.length === 0 || candidate.length > MAX_LENGTH) {
    return DEFAULT_DESTINATION;
  }
  if (candidate.includes("\\")) {
    return DEFAULT_DESTINATION;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate, PLACEHOLDER_ORIGIN);
  } catch {
    return DEFAULT_DESTINATION;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return DEFAULT_DESTINATION;
  }

  const { pathname, search } = parsed;
  const isDashboardPath = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (!isDashboardPath || pathname.includes("//")) {
    return DEFAULT_DESTINATION;
  }

  return `${pathname}${search}`;
}
