import type { ContainerQuote, ContainerQuoteInput } from "@/lib/container-quote";
import { CONTAINER_SCOPE_LABELS, CONTAINER_SIZE_LABELS, SERVICE_LOCATION_LABELS } from "@/lib/domain";
import { formatZar } from "@/lib/money";
import { buildQuoteHref, type QuotePrefill } from "@/lib/quote-link";

export interface QuoteMessageInput {
  jobType: "VEHICLE" | "CONTAINER" | "INDUSTRIAL";
  vehicleDetails?: string;
  tierLabel?: string;
  priceCents?: number | null;
  containerQuoteInput?: ContainerQuoteInput;
  quote?: ContainerQuote | null;
}

export function formatQuoteWhatsAppMessage(input: QuoteMessageInput): string {
  const lines: string[] = [];

  lines.push("*Hawk Mobile Rubberising*");
  lines.push("");

  if (input.jobType === "VEHICLE") {
    lines.push("Vehicle Coating Quote");
    if (input.vehicleDetails) {
      lines.push(`Vehicle: ${input.vehicleDetails}`);
    }
    if (input.tierLabel) {
      lines.push(`Service: ${input.tierLabel}`);
    }
    if (input.priceCents !== null && input.priceCents !== undefined) {
      lines.push(`Estimated price: ${formatZar(input.priceCents)}`);
    } else {
      lines.push("Price: Quote on request");
    }
  } else if (input.jobType === "CONTAINER" && input.containerQuoteInput) {
    const ci = input.containerQuoteInput;
    lines.push("Container Coating Quote");
    lines.push(`Size: ${CONTAINER_SIZE_LABELS[ci.size]}`);
    lines.push(`Surfaces: ${CONTAINER_SCOPE_LABELS[ci.scope]}`);
    lines.push(`Quantity: ${ci.quantity}`);
    lines.push(`Location: ${SERVICE_LOCATION_LABELS[ci.location]}`);

    if (input.quote) {
      lines.push("");
      input.quote.lines.forEach((line) => {
        lines.push(`- ${line.description}: ${formatZar(line.lineTotalCents)}`);
      });
      lines.push("");
      lines.push(`*Total: ${formatZar(input.quote.totalCents)}*`);
    } else {
      lines.push("Price: Confirmed on inspection");
    }
  } else {
    lines.push("Industrial Coating Quote");
    lines.push("Priced after inspection.");
  }

  lines.push("");
  lines.push("Areas are approximate. Final price confirmed after inspection.");

  return lines.join("\n");
}

export function buildQuoteShareMessage(prefill: QuotePrefill, message: string): string {
  const quotePageHref = buildQuoteHref(prefill);
  return `${message}\n\nGet a quote: https://hawkmobile.co.za${quotePageHref}`;
}
