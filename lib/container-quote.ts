import type { ContainerScope, ContainerSize, LineUnit, ServiceLocation } from "@/lib/domain";
import { CONTAINER_SCOPE_LABELS, CONTAINER_SIZE_LABELS } from "@/lib/domain";
import { hundredthsToMilli, suggestedAreaHundredths } from "@/lib/container-specs";
import { computeInvoiceTotals } from "@/lib/money";
import {
  CONTAINER_SCOPE_RATES,
  MOBILISATION_FEE_CENTS,
  type ContainerScopeRate,
  type TierKey,
} from "@/lib/pricing-tiers";

export interface ContainerQuoteInput {
  size: ContainerSize;
  scope: ContainerScope;
  quantity: number;
  location: ServiceLocation;
}

export interface ContainerQuoteConfig {
  rates: Readonly<Record<ContainerScope, ContainerScopeRate>>;
  mobilisationFeeCents: number | null;
}

export interface ContainerQuoteLine {
  description: string;
  unit: LineUnit;
  quantityMilli: number;
  unitPriceCents: number;
  lineTotalCents: number;
  tierKey: TierKey | null;
}

export interface ContainerQuote {
  lines: ContainerQuoteLine[];
  subtotalCents: number;
  totalCents: number;
}

const DEFAULT_CONFIG: ContainerQuoteConfig = {
  rates: CONTAINER_SCOPE_RATES,
  mobilisationFeeCents: MOBILISATION_FEE_CENTS,
};

export function indicativeContainerQuote(
  input: ContainerQuoteInput,
  config: ContainerQuoteConfig = DEFAULT_CONFIG,
): ContainerQuote | null {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 50) {
    return null;
  }

  const rate = config.rates[input.scope];
  const areaHundredths = suggestedAreaHundredths(input.size, input.scope);
  if (rate.ratePerSqmCents === null || areaHundredths === null) {
    return null;
  }

  const areaMilli = hundredthsToMilli(areaHundredths) * input.quantity;
  const description = `${CONTAINER_SCOPE_LABELS[input.scope]} · ${CONTAINER_SIZE_LABELS[input.size]} × ${input.quantity}`;

  const drafts: Array<Omit<ContainerQuoteLine, "lineTotalCents">> = [
    {
      description,
      unit: "SQM",
      quantityMilli: areaMilli,
      unitPriceCents: rate.ratePerSqmCents,
      tierKey: rate.key,
    },
  ];

  if (input.location === "ON_SITE" && config.mobilisationFeeCents !== null) {
    drafts.push({
      description: "On-site mobilisation",
      unit: "EACH",
      quantityMilli: 1000,
      unitPriceCents: config.mobilisationFeeCents,
      tierKey: null,
    });
  }

  const totals = computeInvoiceTotals(drafts, 0);
  const lines = drafts.map((draft, index) => ({
    ...draft,
    lineTotalCents: totals.lineTotals[index] ?? 0,
  }));

  return {
    lines,
    subtotalCents: totals.subtotalCents,
    totalCents: totals.totalCents,
  };
}
