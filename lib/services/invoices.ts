import type { Prisma, PrismaClient } from "@prisma/client";
import type { InvoiceStatus, JobType, Role } from "@/lib/domain";
import { checkTransition } from "@/lib/invoice-status";
import { computeInvoiceTotals } from "@/lib/money";
import { fail, ok, type ActionResult } from "@/lib/result";
import type { InvoiceInput, InvoiceStatusUpdateInput, ListInvoicesQuery } from "@/lib/validations";

export interface InvoiceActor {
  id: string;
  role: Role;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  jobType: JobType;
  status: InvoiceStatus;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  createdAt: string;
}

export interface InvoiceCreated {
  invoice: InvoiceSummary;
  replayed: boolean;
}

export interface InvoicePage {
  items: InvoiceSummary[];
  nextCursor: string | null;
}

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  jobType: JobType;
  status: InvoiceStatus;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  depositCents: number;
  createdAt: Date;
}

const SUMMARY_SELECT = {
  id: true,
  invoiceNumber: true,
  jobType: true,
  status: true,
  clientName: true,
  clientPhone: true,
  clientEmail: true,
  subtotalCents: true,
  vatCents: true,
  totalCents: true,
  depositCents: true,
  createdAt: true,
} satisfies Prisma.InvoiceSelect;

const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 10_000 } as const;
const BUSINESS_TIME_ZONE = "Africa/Johannesburg";

export function toInvoiceSummary(row: InvoiceRow): InvoiceSummary {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    jobType: row.jobType,
    status: row.status,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    subtotalCents: row.subtotalCents,
    vatCents: row.vatCents,
    totalCents: row.totalCents,
    depositCents: row.depositCents,
    balanceCents: row.totalCents - row.depositCents,
    createdAt: row.createdAt.toISOString(),
  };
}

export function businessYear(now: Date): number {
  const year = new Intl.DateTimeFormat("en-ZA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric" }).format(now);
  return Number(year);
}

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `HAWK-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function createInvoiceRecord(
  client: Pick<PrismaClient, "$transaction">,
  input: InvoiceInput,
  actor: InvoiceActor,
  now: Date,
): Promise<ActionResult<InvoiceCreated>> {
  return client.$transaction(async (tx): Promise<ActionResult<InvoiceCreated>> => {
    const existing = await tx.invoice.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { ...SUMMARY_SELECT, createdById: true },
    });

    if (existing) {
      if (existing.createdById !== actor.id) {
        return fail("CONFLICT", "That request key has already been used.");
      }
      return ok({ invoice: toInvoiceSummary(existing), replayed: true });
    }

    const totals = computeInvoiceTotals(input.lines, input.depositCents);

    const lines = input.lines.map((line, index) => {
      const lineTotalCents = totals.lineTotals[index];
      if (lineTotalCents === undefined) {
        throw new Error("Line total missing for invoice line");
      }
      return {
        position: index,
        description: line.description,
        unit: line.unit,
        quantityMilli: line.quantityMilli,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents,
        tierKey: line.tierKey,
      };
    });

    const year = businessYear(now);
    const counter = await tx.invoiceCounter.upsert({
      where: { year },
      create: { year, lastSeq: 1 },
      update: { lastSeq: { increment: 1 } },
      select: { lastSeq: true },
    });

    const created = await tx.invoice.create({
      data: {
        invoiceNumber: formatInvoiceNumber(year, counter.lastSeq),
        idempotencyKey: input.idempotencyKey,
        jobType: input.jobType,
        status: input.status,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail ?? null,
        vehicleDetails: input.vehicleDetails,
        assetDetails: input.assetDetails,
        containerSize: input.containerSize,
        containerScope: input.containerScope,
        containerQuantity: input.containerQuantity,
        serviceLocation: input.serviceLocation,
        siteAddress: input.siteAddress,
        rawVoiceTranscript: input.rawVoiceTranscript,
        subtotalCents: totals.subtotalCents,
        vatCents: totals.vatCents,
        totalCents: totals.totalCents,
        depositCents: totals.depositCents,
        createdById: actor.id,
        lines: { create: lines },
      },
      select: SUMMARY_SELECT,
    });

    return ok({ invoice: toInvoiceSummary(created), replayed: false });
  }, TRANSACTION_OPTIONS);
}

export async function listInvoicesForActor(
  client: Pick<PrismaClient, "invoice">,
  actor: InvoiceActor,
  query: ListInvoicesQuery,
): Promise<InvoicePage> {
  const where: Prisma.InvoiceWhereInput = {
    ...(actor.role === "ADMIN" ? {} : { createdById: actor.id }),
    ...(query.status ? { status: query.status } : {}),
  };

  const rows = await client.invoice.findMany({
    where,
    select: SUMMARY_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
  const last = pageRows[pageRows.length - 1];

  return {
    items: pageRows.map(toInvoiceSummary),
    nextCursor: hasMore && last ? last.id : null,
  };
}

export async function updateInvoiceStatusRecord(
  client: Pick<PrismaClient, "invoice">,
  input: InvoiceStatusUpdateInput,
  actor: InvoiceActor,
): Promise<ActionResult<InvoiceSummary>> {
  const current = await client.invoice.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, createdById: true },
  });

  if (!current || (actor.role !== "ADMIN" && current.createdById !== actor.id)) {
    return fail("NOT_FOUND", "Invoice not found.");
  }

  const check = checkTransition(current.status, input.status, actor.role);
  if (check === "FORBIDDEN") {
    return fail("FORBIDDEN", "Only an administrator can void a paid invoice.");
  }
  if (check === "INVALID") {
    return fail("CONFLICT", `An invoice cannot move from ${current.status} to ${input.status}.`);
  }

  const updated = await client.invoice.updateMany({
    where: { id: current.id, status: current.status },
    data: { status: input.status },
  });

  if (updated.count === 0) {
    return fail("CONFLICT", "The invoice was changed by someone else. Refresh and try again.");
  }

  const row = await client.invoice.findUnique({ where: { id: current.id }, select: SUMMARY_SELECT });
  if (!row) {
    return fail("NOT_FOUND", "Invoice not found.");
  }
  return ok(toInvoiceSummary(row));
}
