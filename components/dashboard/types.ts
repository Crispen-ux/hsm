import type { listInvoices } from "@/app/actions/invoices";

export type InvoiceListResult = Awaited<ReturnType<typeof listInvoices>>;
export type InvoiceSummaryView = Extract<InvoiceListResult, { ok: true }>["data"]["items"][number];
