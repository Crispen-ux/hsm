import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, type RateLimitRule } from "@/lib/rate-limit";
import { createInvoiceRecord, listInvoicesForActor, updateInvoiceStatusRecord, type InvoiceActor } from "@/lib/services/invoices";
import { createLead } from "@/lib/services/leads";
import { invoiceInputSchema, leadInputSchema } from "@/lib/validations";

const URL = process.env.INTEGRATION_DATABASE_URL;
const SAFE = Boolean(URL && (/test/i.test(URL) || process.env.INTEGRATION_ALLOW_TRUNCATE === "yes"));

if (URL && !SAFE) {
  throw new Error("Refusing to run: INTEGRATION_DATABASE_URL must contain 'test' (or set INTEGRATION_ALLOW_TRUNCATE=yes). These tests empty the tables.");
}

const NOW = new Date("2026-03-10T08:00:00.000Z");
const rule: RateLimitRule = { name: "it", limit: 5, windowSeconds: 600 };

function uuid(): string {
  return crypto.randomUUID();
}

function vehicleInput(key: string = uuid(), extra: Record<string, unknown> = {}) {
  return invoiceInputSchema.parse({
    jobType: "VEHICLE",
    idempotencyKey: key,
    clientName: "Sipho Nkosi",
    clientPhone: "0821234567",
    vehicleDetails: "Toyota Hilux",
    depositCents: 50_000,
    lines: [{ description: "Full", unit: "EACH", quantityMilli: 1_000, unitPriceCents: 520_000, tierKey: "VEHICLE_FULL" }],
    ...extra,
  });
}

describe.skipIf(!SAFE)("real PostgreSQL", () => {
  let db: PrismaClient;
  let crew: InvoiceActor;
  let other: InvoiceActor;
  let admin: InvoiceActor;

  beforeAll(async () => {
    db = new PrismaClient({ datasourceUrl: URL });
    await db.$connect();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  beforeEach(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE "invoice_lines","invoices","invoice_counters","rate_limit_buckets","leads","crew_users" RESTART IDENTITY CASCADE',
    );
    const make = (email: string, role: "CREW" | "ADMIN") =>
      db.crewUser.create({ data: { email, name: email, passwordHash: "x", role }, select: { id: true, role: true } });
    crew = await make("a@example.co.za", "CREW");
    other = await make("b@example.co.za", "CREW");
    admin = await make("c@example.co.za", "ADMIN");
  });

  describe("rate limiter SQL", () => {
    it("counts up and blocks after the limit", async () => {
      const results = [];
      for (let index = 0; index < 7; index += 1) {
        results.push(await checkRateLimit(db, rule, "ip-1", NOW));
      }
      expect(results.map((result) => result.allowed)).toEqual([true, true, true, true, true, false, false]);
      expect(results[4]?.remaining).toBe(0);
      expect(results[5]?.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("starts a fresh window once the old one has expired", async () => {
      for (let index = 0; index < 6; index += 1) {
        await checkRateLimit(db, rule, "ip-2", NOW);
      }
      const later = new Date(NOW.getTime() + 601_000);
      const fresh = await checkRateLimit(db, rule, "ip-2", later);
      expect(fresh).toMatchObject({ allowed: true, remaining: 4 });
    });

    it("keeps identifiers separate", async () => {
      for (let index = 0; index < 6; index += 1) {
        await checkRateLimit(db, rule, "ip-3", NOW);
      }
      expect((await checkRateLimit(db, rule, "ip-4", NOW)).allowed).toBe(true);
    });

    it("counts concurrent requests exactly, with no lost updates", async () => {
      const results = await Promise.all(Array.from({ length: 20 }, () => checkRateLimit(db, { ...rule, limit: 8 }, "burst", NOW)));
      expect(results.filter((result) => result.allowed)).toHaveLength(8);
      const row = await db.rateLimitBucket.findUnique({ where: { key: "it:burst" } });
      expect(row?.count).toBe(20);
    });
  });

  describe("leads", () => {
    it("stores a lead with consent time, hashed ip and a unique reference", async () => {
      const input = leadInputSchema.parse({
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
      const receipt = await createLead(db, input, { ipHash: "abc", now: NOW });
      const row = await db.lead.findUnique({ where: { referenceCode: receipt.referenceCode } });
      expect(row).toMatchObject({
        phone: "+27821234567",
        containerSize: "FT40_HC",
        containerScope: "FULL_SHELL",
        containerQuantity: 2,
        status: "NEW",
        ipHash: "abc",
      });
      expect(row?.consentGivenAt.toISOString()).toBe(NOW.toISOString());
    });
  });

  describe("invoices", () => {
    it("stores integer totals and lines exactly", async () => {
      const result = await createInvoiceRecord(db, vehicleInput(), crew, NOW);
      expect(result.ok && result.data.invoice).toMatchObject({
        invoiceNumber: "HAWK-2026-0001",
        subtotalCents: 520_000,
        vatCents: 78_000,
        totalCents: 598_000,
        depositCents: 50_000,
        status: "DRAFT",
      });
      const stored = await db.invoice.findFirst({ include: { lines: true } });
      expect(stored?.lines).toHaveLength(1);
      expect(stored?.lines[0]).toMatchObject({ lineTotalCents: 520_000, quantityMilli: 1_000, tierKey: "VEHICLE_FULL", position: 0 });
    });

    it("prices a fractional container area exactly", async () => {
      const input = invoiceInputSchema.parse({
        jobType: "CONTAINER",
        idempotencyKey: uuid(),
        clientName: "Thandi Mokoena",
        clientPhone: "0821234567",
        containerSize: "FT20",
        containerScope: "FLOOR_ONLY",
        containerQuantity: 1,
        serviceLocation: "IN_YARD",
        siteAddress: "12 Main Reef Road",
        lines: [{ description: "Floor", unit: "SQM", quantityMilli: 13_875, unitPriceCents: 12_345, tierKey: "CONTAINER_FLOOR_ONLY" }],
      });
      const result = await createInvoiceRecord(db, input, crew, NOW);
      expect(result.ok && result.data.invoice).toMatchObject({ subtotalCents: 171_287, vatCents: 25_693, totalCents: 196_980 });
    });

    it("issues gap-free, unique numbers under 25 concurrent creates", async () => {
      const results = await Promise.all(Array.from({ length: 25 }, () => createInvoiceRecord(db, vehicleInput(), crew, NOW)));
      const numbers = results.map((result) => (result.ok ? result.data.invoice.invoiceNumber : "FAILED"));
      expect(numbers).not.toContain("FAILED");
      expect(new Set(numbers).size).toBe(25);
      const sequence = numbers.map((number) => Number(number.slice(-4))).sort((a, b) => a - b);
      expect(sequence).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));
      const counter = await db.invoiceCounter.findUnique({ where: { year: 2026 } });
      expect(counter?.lastSeq).toBe(25);
    });

    it("creates exactly one invoice when the same request is sent concurrently, and burns no number", async () => {
      const key = uuid();
      const settled = await Promise.allSettled(Array.from({ length: 6 }, () => createInvoiceRecord(db, vehicleInput(key), crew, NOW)));
      expect(await db.invoice.count()).toBe(1);
      const succeeded = settled.filter((entry) => entry.status === "fulfilled");
      expect(succeeded.length).toBeGreaterThanOrEqual(1);
      for (const entry of settled) {
        if (entry.status === "rejected") {
          expect(String((entry.reason as { code?: string }).code)).toBe("P2002");
        }
      }
      const counter = await db.invoiceCounter.findUnique({ where: { year: 2026 } });
      expect(counter?.lastSeq).toBe(1);
      const next = await createInvoiceRecord(db, vehicleInput(), crew, NOW);
      expect(next.ok && next.data.invoice.invoiceNumber).toBe("HAWK-2026-0002");
    });

    it("replays a repeated key without creating or renumbering", async () => {
      const key = uuid();
      await createInvoiceRecord(db, vehicleInput(key), crew, NOW);
      const replay = await createInvoiceRecord(db, vehicleInput(key), crew, NOW);
      expect(replay.ok && replay.data.replayed).toBe(true);
      expect(await db.invoice.count()).toBe(1);
    });

    it("refuses another user's idempotency key", async () => {
      const key = uuid();
      await createInvoiceRecord(db, vehicleInput(key), crew, NOW);
      const result = await createInvoiceRecord(db, vehicleInput(key), other, NOW);
      expect(!result.ok && result.error.code).toBe("CONFLICT");
    });

    it("restarts numbering on the first South African day of the new year", async () => {
      await createInvoiceRecord(db, vehicleInput(), crew, new Date("2026-12-31T21:59:00.000Z"));
      const first = await createInvoiceRecord(db, vehicleInput(), crew, new Date("2026-12-31T22:00:00.000Z"));
      expect(first.ok && first.data.invoice.invoiceNumber).toBe("HAWK-2027-0001");
    });

    it("rolls back the number if the invoice insert fails", async () => {
      const bad = vehicleInput(uuid());
      await expect(createInvoiceRecord(db, bad, { id: "no-such-user", role: "CREW" }, NOW)).rejects.toMatchObject({ code: "P2003" });
      expect(await db.invoiceCounter.count()).toBe(0);
      const ok = await createInvoiceRecord(db, vehicleInput(), crew, NOW);
      expect(ok.ok && ok.data.invoice.invoiceNumber).toBe("HAWK-2026-0001");
    });
  });

  describe("listing and status", () => {
    it("scopes crew to their own invoices, admins see all, and pages by cursor", async () => {
      for (let index = 0; index < 5; index += 1) {
        await createInvoiceRecord(db, vehicleInput(), crew, new Date(NOW.getTime() + index * 1000));
      }
      await createInvoiceRecord(db, vehicleInput(), other, new Date(NOW.getTime() + 9000));

      const crewPage = await listInvoicesForActor(db, crew, { limit: 3 });
      expect(crewPage.items).toHaveLength(3);
      expect(crewPage.nextCursor).not.toBeNull();
      const second = await listInvoicesForActor(db, crew, { limit: 3, cursor: crewPage.nextCursor ?? undefined });
      expect(second.items).toHaveLength(2);
      expect(second.nextCursor).toBeNull();
      const ids = [...crewPage.items, ...second.items].map((item) => item.id);
      expect(new Set(ids).size).toBe(5);

      expect((await listInvoicesForActor(db, other, { limit: 20 })).items).toHaveLength(1);
      expect((await listInvoicesForActor(db, admin, { limit: 20 })).items).toHaveLength(6);
      expect((await listInvoicesForActor(db, admin, { limit: 20, status: "PAID" })).items).toHaveLength(0);
    });

    it("moves DRAFT to ISSUED to PAID and blocks crew from voiding a paid invoice", async () => {
      const created = await createInvoiceRecord(db, vehicleInput(), crew, NOW);
      const id = created.ok ? created.data.invoice.id : "";
      expect((await updateInvoiceStatusRecord(db, { id, status: "ISSUED" }, crew)).ok).toBe(true);
      expect((await updateInvoiceStatusRecord(db, { id, status: "PAID" }, crew)).ok).toBe(true);
      const denied = await updateInvoiceStatusRecord(db, { id, status: "VOID" }, crew);
      expect(!denied.ok && denied.error.code).toBe("FORBIDDEN");
      expect((await updateInvoiceStatusRecord(db, { id, status: "VOID" }, admin)).ok).toBe(true);
    });

    it("lets only one of two racing status changes win", async () => {
      const created = await createInvoiceRecord(db, vehicleInput(), crew, NOW);
      const id = created.ok ? created.data.invoice.id : "";
      const [a, b] = await Promise.all([
        updateInvoiceStatusRecord(db, { id, status: "ISSUED" }, crew),
        updateInvoiceStatusRecord(db, { id, status: "VOID" }, crew),
      ]);
      expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
      const loser = a.ok ? b : a;
      expect(!loser.ok && loser.error.code).toBe("CONFLICT");
    });

    it("hides other crew members' invoices from status changes", async () => {
      const created = await createInvoiceRecord(db, vehicleInput(), crew, NOW);
      const id = created.ok ? created.data.invoice.id : "";
      const result = await updateInvoiceStatusRecord(db, { id, status: "ISSUED" }, other);
      expect(!result.ok && result.error.code).toBe("NOT_FOUND");
    });
  });

  describe("database constraints (prisma/constraints.sql)", () => {
    const insert = (columns: string, values: string) =>
      db.$executeRawUnsafe(
        `INSERT INTO "invoices" ("id","invoice_number","idempotency_key","client_name","client_phone","created_by_id","updated_at",${columns}) VALUES ('x'||gen_random_uuid(),'N'||gen_random_uuid(),gen_random_uuid()::text,'C','+27821234567',$1,now(),${values})`,
        crew.id,
      );

    it("accepts consistent rows", async () => {
      await expect(insert('"job_type","vehicle_details","subtotal_cents","vat_cents","total_cents","deposit_cents"', "'VEHICLE','Hilux',100,15,115,0")).resolves.toBe(1);
    });

    it.each([
      ["a total that does not equal subtotal plus VAT", '"job_type","vehicle_details","subtotal_cents","vat_cents","total_cents","deposit_cents"', "'VEHICLE','Hilux',100,15,999,0", "invoices_total_matches_parts"],
      ["a negative amount", '"job_type","vehicle_details","subtotal_cents","vat_cents","total_cents","deposit_cents"', "'VEHICLE','Hilux',-100,15,-85,0", "invoices_amounts_non_negative"],
      ["a deposit above the total", '"job_type","vehicle_details","subtotal_cents","vat_cents","total_cents","deposit_cents"', "'VEHICLE','Hilux',100,15,115,500", "invoices_deposit_within_total"],
      ["a vehicle job with no vehicle details", '"job_type","subtotal_cents","vat_cents","total_cents","deposit_cents"', "'VEHICLE',100,15,115,0", "invoices_vehicle_requires_details"],
      ["a container job with no size, scope or quantity", '"job_type","subtotal_cents","vat_cents","total_cents","deposit_cents"', "'CONTAINER',100,15,115,0", "invoices_container_requires_spec"],
      ["a container quantity above 50", '"job_type","vehicle_details","container_quantity","subtotal_cents","vat_cents","total_cents","deposit_cents"', "'VEHICLE','Hilux',51,100,15,115,0", "invoices_container_quantity_range"],
    ])("rejects %s", async (_label, columns, values, constraint) => {
      await expect(insert(columns, values)).rejects.toThrow(new RegExp(constraint));
    });

    it("rejects a line with a non-positive quantity", async () => {
      const created = await createInvoiceRecord(db, vehicleInput(), crew, NOW);
      const id = created.ok ? created.data.invoice.id : "";
      await expect(
        db.$executeRawUnsafe(
          `INSERT INTO "invoice_lines" ("id","invoice_id","description","quantity_milli","unit_price_cents","line_total_cents") VALUES ('l1',$1,'x',0,100,0)`,
          id,
        ),
      ).rejects.toThrow(/invoice_lines_amounts_non_negative/);
    });

    it("stops a crew user with invoices from being deleted, and cascades lines with their invoice", async () => {
      const created = await createInvoiceRecord(db, vehicleInput(), crew, NOW);
      const id = created.ok ? created.data.invoice.id : "";
      await expect(db.crewUser.delete({ where: { id: crew.id } })).rejects.toMatchObject({ code: "P2003" });
      await db.invoice.delete({ where: { id } });
      expect(await db.invoiceLine.count()).toBe(0);
    });
  });
});
