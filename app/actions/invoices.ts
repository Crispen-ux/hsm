"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { mapUnknownError } from "@/lib/errors";
import { checkRateLimit, INVOICE_WRITE_RULE } from "@/lib/rate-limit";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/result";
import {
  createInvoiceRecord,
  listInvoicesForActor,
  updateInvoiceStatusRecord,
  type InvoiceCreated,
  type InvoicePage,
  type InvoiceSummary,
} from "@/lib/services/invoices";
import { getSessionUser } from "@/lib/session";
import { invoiceInputSchema, invoiceStatusUpdateSchema, listInvoicesQuerySchema } from "@/lib/validations";

const UNAUTHORIZED_MESSAGE = "Please sign in to continue.";

function revalidateDashboard(): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoice-engine");
}

export async function createInvoice(input: unknown): Promise<ActionResult<InvoiceCreated>> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return fail("UNAUTHORIZED", UNAUTHORIZED_MESSAGE);
    }

    const limit = await checkRateLimit(db, INVOICE_WRITE_RULE, user.id);
    if (!limit.allowed) {
      return fail("RATE_LIMITED", "You are saving invoices too quickly. Please wait a moment.");
    }

    const parsed = invoiceInputSchema.safeParse(input);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const result = await createInvoiceRecord(db, parsed.data, { id: user.id, role: user.role }, new Date());
    if (result.ok && !result.data.replayed) {
      revalidateDashboard();
    }
    return result;
  } catch (error) {
    return mapUnknownError("invoices.create", error);
  }
}

export async function listInvoices(query: unknown = {}): Promise<ActionResult<InvoicePage>> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return fail("UNAUTHORIZED", UNAUTHORIZED_MESSAGE);
    }

    const parsed = listInvoicesQuerySchema.safeParse(query);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    return ok(await listInvoicesForActor(db, { id: user.id, role: user.role }, parsed.data));
  } catch (error) {
    return mapUnknownError("invoices.list", error);
  }
}

export async function updateInvoiceStatus(input: unknown): Promise<ActionResult<InvoiceSummary>> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return fail("UNAUTHORIZED", UNAUTHORIZED_MESSAGE);
    }

    const limit = await checkRateLimit(db, INVOICE_WRITE_RULE, user.id);
    if (!limit.allowed) {
      return fail("RATE_LIMITED", "You are making changes too quickly. Please wait a moment.");
    }

    const parsed = invoiceStatusUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const result = await updateInvoiceStatusRecord(db, parsed.data, { id: user.id, role: user.role });
    if (result.ok) {
      revalidateDashboard();
    }
    return result;
  } catch (error) {
    return mapUnknownError("invoices.updateStatus", error);
  }
}
