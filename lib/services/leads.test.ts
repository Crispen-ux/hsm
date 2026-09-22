import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { createLead, generateReferenceCode } from "@/lib/services/leads";
import { leadInputSchema } from "@/lib/validations";

const NOW = new Date("2026-03-01T08:00:00.000Z");
const context = { ipHash: "hash", now: NOW };

function client(create: ReturnType<typeof vi.fn>) {
  return { lead: { create } } as unknown as Pick<PrismaClient, "lead">;
}

const containerLead = leadInputSchema.parse({
  fullName: "Thandi Mokoena",
  phone: "082 123 4567",
  serviceInterest: "CONTAINER",
  containerSize: "FT40_HC",
  containerScope: "FULL_SHELL",
  containerQuantity: 2,
  serviceLocation: "ON_SITE",
  siteLocation: "Germiston",
  consent: true,
});

const vehicleLead = leadInputSchema.parse({
  fullName: "Sipho Nkosi",
  phone: "0821234567",
  serviceInterest: "FULL_VEHICLE",
  vehicleMake: "Toyota",
  vehicleModel: "Hilux",
  consent: true,
});

describe("generateReferenceCode", () => {
  it("produces HWK- codes from an unambiguous alphabet", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(generateReferenceCode()).toMatch(/^HWK-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    }
  });

  it("rejects biased bytes and keeps drawing", () => {
    const draws = [new Uint8Array(12).fill(250), new Uint8Array(12).fill(0)];
    const random = vi.fn(() => draws.shift() ?? new Uint8Array(12).fill(0));
    expect(generateReferenceCode(random)).toBe("HWK-222222");
    expect(random).toHaveBeenCalledTimes(2);
  });
});

describe("createLead", () => {
  it("stores consent time, ip hash and container fields", async () => {
    const create = vi.fn().mockResolvedValue({ id: "lead-1" });
    const receipt = await createLead(client(create), containerLead, context);

    expect(receipt.referenceCode).toMatch(/^HWK-/);
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      fullName: "Thandi Mokoena",
      phone: "+27821234567",
      serviceInterest: "CONTAINER",
      containerSize: "FT40_HC",
      containerScope: "FULL_SHELL",
      containerQuantity: 2,
      serviceLocation: "ON_SITE",
      siteLocation: "Germiston",
      consentGivenAt: NOW,
      ipHash: "hash",
      referenceCode: receipt.referenceCode,
    });
  });

  it("stores vehicle details without container fields", async () => {
    const create = vi.fn().mockResolvedValue({ id: "lead-1" });
    await createLead(client(create), vehicleLead, context);
    const data = create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({ vehicleMake: "Toyota", vehicleModel: "Hilux" });
    expect(data.containerSize).toBeUndefined();
  });

  it("never persists the honeypot field", async () => {
    const create = vi.fn().mockResolvedValue({ id: "lead-1" });
    await createLead(client(create), vehicleLead, context);
    expect(create.mock.calls[0]?.[0].data).not.toHaveProperty("website");
  });

  it("retries on a reference collision", async () => {
    const collision = Object.assign(new Error("unique"), { code: "P2002" });
    const create = vi.fn().mockRejectedValueOnce(collision).mockResolvedValueOnce({ id: "lead-1" });
    const receipt = await createLead(client(create), vehicleLead, context);
    expect(create).toHaveBeenCalledTimes(2);
    expect(receipt.referenceCode).toMatch(/^HWK-/);
  });

  it("gives up after repeated collisions and rethrows other errors immediately", async () => {
    const collision = Object.assign(new Error("unique"), { code: "P2002" });
    const alwaysCollides = vi.fn().mockRejectedValue(collision);
    await expect(createLead(client(alwaysCollides), vehicleLead, context)).rejects.toBe(collision);
    expect(alwaysCollides).toHaveBeenCalledTimes(3);

    const boom = new Error("connection lost");
    const failing = vi.fn().mockRejectedValue(boom);
    await expect(createLead(client(failing), vehicleLead, context)).rejects.toBe(boom);
    expect(failing).toHaveBeenCalledTimes(1);
  });
});
