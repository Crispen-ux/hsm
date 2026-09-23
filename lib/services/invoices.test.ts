import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  businessYear,
  createInvoiceRecord,
  formatInvoiceNumber,
  listInvoicesForActor,
  updateInvoiceStatusRecord,
  type InvoiceActor,
} from "@/lib/services/invoices";
import { invoiceInputSchema } from "@/lib/validations";

const NOW = new Date("2026-03-01T08:00:00.000Z");
const crew: InvoiceActor = { id: "crew-1", role: "CREW" };
const otherCrew: InvoiceActor = { id: "crew-2", role: "CREW" };
const admin: InvoiceActor = { id: "admin-1", role: "ADMIN" };

interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  idempotencyKey: string;
  jobType: "VEHICLE" | "CONTAINER" | "INDUSTRIAL";
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID";
  clientName: string;
  clientPhone: string;
  subtotalCents: number;
  totalCents: number;
  depositCents: number;
  createdById: string;
  createdAt: Date;
  lines: Array<Record<string, unknown>>;
}

function fakeDatabase() {
  const invoices: StoredInvoice[] = [];
  const counters = new Map<number, number>();

  const invoice = {
    findUnique: vi.fn(async ({ where }: { where: { id?: string; idempotencyKey?: string } }) => {
      const found = invoices.find((row) =>
        where.idempotencyKey !== undefined ? row.idempotencyKey === where.idempotencyKey : row.id === where.id,
      );
      return found ?? null;
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> & { lines: { create: Array<Record<string, unknown>> } } }) => {
      const { lines, ...rest } = data;
      const row = {
        ...rest,
        id: `inv-${invoices.length + 1}`,
        createdAt: NOW,
        lines: lines.create,
      } as unknown as StoredInvoice;
      invoices.push(row);
      return row;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: { id: string; status: string }; data: { status: StoredInvoice["status"] } }) => {
      const row = invoices.find((candidate) => candidate.id === where.id && candidate.status === where.status);
      if (!row) {
        return { count: 0 };
      }
      row.status = data.status;
      return { count: 1 };
    }),
    findMany: vi.fn(async () => invoices),
  };

  const invoiceCounter = {
    upsert: vi.fn(async ({ where }: { where: { year: number } }) => {
      const next = (counters.get(where.year) ?? 0) + 1;
      counters.set(where.year, next);
      return { lastSeq: next };
    }),
  };

  const tx = { invoice, invoiceCounter };
  const client = {
    $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    invoice,
  };

  return {
    client: client as unknown as Pick<PrismaClient, "$transaction" | "invoice">,
    invoices,
    invoice,
    invoiceCounter,
  };
}

const uuid1 = "3f8f6f0e-7b0c-4c1a-9d3e-2b1f4a5c6d7e";
const uuid2 = "4a9f6f0e-7b0c-4c1a-9d3e-2b1f4a5c6d7f";

function vehicleInput(idempotencyKey = uuid1, overrides: Record<string, unknown> = {}) {
  return invoiceInputSchema.parse({
    jobType: "VEHICLE",
    idempotencyKey,
    clientName: "Sipho Nkosi",
    clientPhone: "0821234567",
    vehicleDetails: "Toyota Hilux double cab",
    depositCents: 50_000,
    lines: [
      {
        description: "Full bed coating",
        unit: "EACH",
        quantityMilli: 1_000,
        unitPriceCents: 520_000,
        tierKey: "VEHICLE_FULL",
      },
    ],
    ...overrides,
  });
}

describe("invoice numbering", () => {
  it("formats sequential numbers", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("HAWK-2026-0001");
    expect(formatInvoiceNumber(2026, 12345)).toBe("HAWK-2026-12345");
  });

  it("uses the South African calendar year at the boundary", () => {
    expect(businessYear(new Date("2026-12-31T21:59:59.000Z"))).toBe(2026);
    expect(businessYear(new Date("2026-12-31T22:00:00.000Z"))).toBe(2027);
  });
});

describe("createInvoiceRecord", () => {
  it("recomputes totals on the server and numbers sequentially", async () => {
    const { client, invoices } = fakeDatabase();

    const first = await createInvoiceRecord(client, vehicleInput(uuid1), crew, NOW);
    const second = await createInvoiceRecord(client, vehicleInput(uuid2), crew, NOW);

    expect(first.ok && first.data.invoice.invoiceNumber).toBe("HAWK-2026-0001");
    expect(second.ok && second.data.invoice.invoiceNumber).toBe("HAWK-2026-0002");
    expect(first.ok && first.data.invoice).toMatchObject({
      subtotalCents: 520_000,
      totalCents: 520_000,
      depositCents: 50_000,
      balanceCents: 470_000,
      status: "DRAFT",
    });
    expect(invoices[0]?.lines[0]).toMatchObject({ position: 0, lineTotalCents: 520_000, tierKey: "VEHICLE_FULL" });
    expect(invoices[0]?.createdById).toBe("crew-1");
  });

  it("prices fractional container areas with integer maths", async () => {
    const { client, invoices } = fakeDatabase();
    const input = invoiceInputSchema.parse({
      jobType: "CONTAINER",
      idempotencyKey: uuid1,
      clientName: "Thandi Mokoena",
      clientPhone: "0821234567",
      containerSize: "FT20",
      containerScope: "FLOOR_ONLY",
      containerQuantity: 1,
      serviceLocation: "IN_YARD",
      siteAddress: "12 Main Reef Road, Germiston",
      lines: [
        { description: "Floor 20ft", unit: "SQM", quantityMilli: 13_875, unitPriceCents: 12_345, tierKey: "CONTAINER_FLOOR_ONLY" },
      ],
    });
    const result = await createInvoiceRecord(client, input, crew, NOW);
    expect(result.ok && result.data.invoice.subtotalCents).toBe(171_287);
    expect(result.ok && result.data.invoice.totalCents).toBe(171_287);
    expect(invoices[0]?.lines[0]).toMatchObject({ lineTotalCents: 171_287, unit: "SQM" });
  });

  it("replays an identical request without creating or renumbering", async () => {
    const { client, invoices, invoiceCounter } = fakeDatabase();
    await createInvoiceRecord(client, vehicleInput(uuid1), crew, NOW);
    const replay = await createInvoiceRecord(client, vehicleInput(uuid1), crew, NOW);

    expect(replay.ok && replay.data.replayed).toBe(true);
    expect(replay.ok && replay.data.invoice.invoiceNumber).toBe("HAWK-2026-0001");
    expect(invoices).toHaveLength(1);
    expect(invoiceCounter.upsert).toHaveBeenCalledTimes(1);
  });

  it("refuses an idempotency key that belongs to another user", async () => {
    const { client } = fakeDatabase();
    await createInvoiceRecord(client, vehicleInput(uuid1), crew, NOW);
    const result = await createInvoiceRecord(client, vehicleInput(uuid1), otherCrew, NOW);
    expect(!result.ok && result.error.code).toBe("CONFLICT");
  });

  it("stores an issued invoice when requested", async () => {
    const { client } = fakeDatabase();
    const result = await createInvoiceRecord(client, vehicleInput(uuid1, { status: "ISSUED" }), crew, NOW);
    expect(result.ok && result.data.invoice.status).toBe("ISSUED");
  });
});

describe("listInvoicesForActor", () => {
  function row(id: string) {
    return {
      id,
      invoiceNumber: `HAWK-2026-${id}`,
      jobType: "VEHICLE" as const,
      status: "DRAFT" as const,
      clientName: "Client",
      clientPhone: "+27821234567",
      subtotalCents: 100,
      totalCents: 100,
      depositCents: 0,
      createdAt: NOW,
    };
  }

  function fakeList(rows: ReturnType<typeof row>[]) {
    const findMany = vi.fn().mockResolvedValue(rows);
    return { client: { invoice: { findMany } } as unknown as Pick<PrismaClient, "invoice">, findMany };
  }

  it("scopes crew to their own invoices and admins to all", async () => {
    const crewList = fakeList([]);
    await listInvoicesForActor(crewList.client, crew, { limit: 20 });
    expect(crewList.findMany.mock.calls[0]?.[0].where).toEqual({ createdById: "crew-1" });

    const adminList = fakeList([]);
    await listInvoicesForActor(adminList.client, admin, { limit: 20, status: "PAID" });
    expect(adminList.findMany.mock.calls[0]?.[0].where).toEqual({ status: "PAID" });
  });

  it("paginates with a cursor from the last returned row", async () => {
    const { client, findMany } = fakeList([row("3"), row("2"), row("1")]);
    const page = await listInvoicesForActor(client, admin, { limit: 2 });

    expect(findMany.mock.calls[0]?.[0].take).toBe(3);
    expect(page.items.map((item) => item.id)).toEqual(["3", "2"]);
    expect(page.nextCursor).toBe("2");
  });

  it("returns no cursor on the final page and passes an incoming cursor through", async () => {
    const { client, findMany } = fakeList([row("1")]);
    const page = await listInvoicesForActor(client, admin, { limit: 2, cursor: "2" });

    expect(page.nextCursor).toBeNull();
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ cursor: { id: "2" }, skip: 1 });
  });
});

describe("updateInvoiceStatusRecord", () => {
  async function seeded() {
    const database = fakeDatabase();
    await createInvoiceRecord(database.client, vehicleInput(uuid1), crew, NOW);
    return database;
  }

  it("lets the owner issue a draft", async () => {
    const { client } = await seeded();
    const result = await updateInvoiceStatusRecord(client, { id: "inv-1", status: "ISSUED" }, crew);
    expect(result.ok && result.data.status).toBe("ISSUED");
  });

  it("hides other crew members' invoices", async () => {
    const { client } = await seeded();
    const result = await updateInvoiceStatusRecord(client, { id: "inv-1", status: "ISSUED" }, otherCrew);
    expect(!result.ok && result.error.code).toBe("NOT_FOUND");
  });

  it("lets an admin act on any invoice", async () => {
    const { client } = await seeded();
    const result = await updateInvoiceStatusRecord(client, { id: "inv-1", status: "ISSUED" }, admin);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid transitions", async () => {
    const { client } = await seeded();
    const result = await updateInvoiceStatusRecord(client, { id: "inv-1", status: "PAID" }, crew);
    expect(!result.ok && result.error.code).toBe("CONFLICT");
  });

  it("forbids crew from voiding a paid invoice but allows admins", async () => {
    const { client, invoices } = await seeded();
    const row = invoices[0];
    if (!row) {
      throw new Error("seed failed");
    }
    row.status = "PAID";

    const denied = await updateInvoiceStatusRecord(client, { id: "inv-1", status: "VOID" }, crew);
    expect(!denied.ok && denied.error.code).toBe("FORBIDDEN");

    const allowed = await updateInvoiceStatusRecord(client, { id: "inv-1", status: "VOID" }, admin);
    expect(allowed.ok && allowed.data.status).toBe("VOID");
  });

  it("reports a conflict when the row changed concurrently", async () => {
    const { client, invoice } = await seeded();
    invoice.updateMany.mockResolvedValueOnce({ count: 0 });
    const result = await updateInvoiceStatusRecord(client, { id: "inv-1", status: "ISSUED" }, crew);
    expect(!result.ok && result.error.code).toBe("CONFLICT");
  });

  it("returns not found for unknown ids", async () => {
    const { client } = await seeded();
    const result = await updateInvoiceStatusRecord(client, { id: "missing", status: "ISSUED" }, admin);
    expect(!result.ok && result.error.code).toBe("NOT_FOUND");
  });
});
