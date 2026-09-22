import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fail, fromZodError, ok } from "@/lib/result";

describe("result helpers", () => {
  it("builds ok and fail results", () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 });
    expect(fail("NOT_FOUND", "missing")).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "missing" } });
  });

  it("groups zod issues by dotted field path", () => {
    const schema = z.object({ name: z.string().min(2), lines: z.array(z.object({ qty: z.number() })) });
    const parsed = schema.safeParse({ name: "a", lines: [{ qty: "x" }] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const result = fromZodError(parsed.error);
      expect(!result.ok && result.error.code).toBe("VALIDATION");
      expect(!result.ok && Object.keys(result.error.fieldErrors ?? {}).sort()).toEqual(["lines.0.qty", "name"]);
    }
  });
});
