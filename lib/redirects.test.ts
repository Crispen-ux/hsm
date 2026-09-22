import { describe, expect, it } from "vitest";
import { safeDashboardRedirect } from "@/lib/redirects";

describe("safeDashboardRedirect", () => {
  it("allows dashboard paths", () => {
    expect(safeDashboardRedirect("/dashboard")).toBe("/dashboard");
    expect(safeDashboardRedirect("/dashboard/invoice-engine")).toBe("/dashboard/invoice-engine");
    expect(safeDashboardRedirect("/dashboard?source=pwa")).toBe("/dashboard?source=pwa");
  });

  it("reduces the absolute callback URLs Auth.js produces to a same-site path", () => {
    expect(safeDashboardRedirect("http://localhost:3111/dashboard/invoice-engine")).toBe(
      "/dashboard/invoice-engine",
    );
    expect(safeDashboardRedirect("https://hawk.example.co.za/dashboard")).toBe("/dashboard");
  });

  it("never yields an off-site destination", () => {
    for (const candidate of [
      "https://evil.example/dashboard",
      "//evil.example/dashboard",
      "https://evil.example@hawk.example/dashboard",
    ]) {
      expect(safeDashboardRedirect(candidate).startsWith("/dashboard")).toBe(true);
    }
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/dashboard//evil.example",
    "/dashboard\\evil",
    "/login",
    "javascript:alert(1)",
    "data:text/html,x",
    "/dashboardx",
    "",
    `/dashboard/${"a".repeat(300)}`,
  ])("falls back to the default for %s", (candidate) => {
    expect(safeDashboardRedirect(candidate)).toBe("/dashboard");
  });

  it("rejects non-strings", () => {
    expect(safeDashboardRedirect(null)).toBe("/dashboard");
    expect(safeDashboardRedirect(42)).toBe("/dashboard");
  });
});
