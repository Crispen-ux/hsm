import { describe, expect, it } from "vitest";
import { normalizeLeadPayload } from "@/lib/lead-payload";
import { leadInputSchema } from "@/lib/validations";

const base = { fullName: "Sipho Nkosi", phone: "0821234567", consent: true };

describe("normalizeLeadPayload", () => {
  it("drops container fields on a vehicle lead so a no-JavaScript submission still validates", () => {
    const payload = normalizeLeadPayload({
      ...base,
      serviceInterest: "FULL_VEHICLE",
      vehicleMake: "Toyota",
      containerSize: "FT20",
      containerQuantity: 1,
      siteLocation: "Germiston",
    });
    expect(payload).not.toHaveProperty("containerSize");
    expect(payload).not.toHaveProperty("siteLocation");
    expect(leadInputSchema.safeParse(payload).success).toBe(true);
  });

  it("drops vehicle fields on a container lead", () => {
    const payload = normalizeLeadPayload({
      ...base,
      serviceInterest: "CONTAINER",
      vehicleMake: "Toyota",
      containerSize: "FT40",
      containerScope: "FLOOR_ONLY",
      containerQuantity: 2,
      serviceLocation: "IN_YARD",
      siteLocation: "Germiston",
    });
    expect(payload).not.toHaveProperty("vehicleMake");
    expect(leadInputSchema.safeParse(payload).success).toBe(true);
  });

  it("does not add or repair anything else", () => {
    const payload = normalizeLeadPayload({ serviceInterest: "CONTAINER", fullName: "A" });
    expect(payload).toEqual({ serviceInterest: "CONTAINER", fullName: "A" });
    expect(leadInputSchema.safeParse(payload).success).toBe(false);
  });
});
