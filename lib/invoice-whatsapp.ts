import type { InvoiceSummary } from "@/lib/services/invoices";
import { formatZar } from "@/lib/money";

export function formatInvoiceWhatsAppMessage(invoice: InvoiceSummary): string {
  const lines: string[] = [];

  lines.push("*Hawk Mobile Rubberising*");
  lines.push(`Invoice ${invoice.invoiceNumber}`);
  lines.push(`Status: ${invoice.status}`);
  lines.push("");

  lines.push(`Client: ${invoice.clientName}`);
  if (invoice.clientEmail) {
    lines.push(`Email: ${invoice.clientEmail}`);
  }

  lines.push("");
  lines.push(`*Total: ${formatZar(invoice.totalCents)}*`);

  if (invoice.depositCents > 0) {
    lines.push(`Deposit paid: ${formatZar(invoice.depositCents)}`);
    lines.push(`Balance due: ${formatZar(invoice.totalCents - invoice.depositCents)}`);
  }

  lines.push("");
  lines.push("Hawk Mobile Rubberising - Polyurea & Rubber Coatings");

  return lines.join("\n");
}
