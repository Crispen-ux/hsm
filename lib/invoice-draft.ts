import { z } from "zod";
import {
  CONTAINER_SCOPES,
  CONTAINER_SCOPE_LABELS,
  CONTAINER_SIZES,
  CONTAINER_SIZE_LABELS,
  JOB_TYPES,
  LINE_UNITS,
  SERVICE_LOCATIONS,
} from "@/lib/domain";
import type { ContainerScope, ContainerSize, JobType, LineUnit, ServiceLocation } from "@/lib/domain";
import { hundredthsToMilli, suggestedAreaHundredths } from "@/lib/container-specs";
import { computeInvoiceTotals, MoneyRangeError, parseRandsToCents, type InvoiceTotals } from "@/lib/money";
import { normalizeSaPhone } from "@/lib/phone";
import {
  CONTAINER_SCOPE_RATES,
  MOBILISATION_FEE_CENTS,
  TIER_KEYS,
  VEHICLE_TIERS,
  type ContainerScopeRate,
  type TierKey,
  type VehicleTierKey,
} from "@/lib/pricing-tiers";
import { centsToRandsString, formatMilli, parseQuantityToMilli } from "@/lib/quantity";
import { invoiceInputSchema, type InvoiceInput, type ParsedSpeech } from "@/lib/validations";

export interface DraftLine {
  key: string;
  auto: boolean;
  description: string;
  unit: LineUnit;
  quantity: string;
  unitPrice: string;
  tierKey: TierKey | null;
}

export interface InvoiceDraft {
  idempotencyKey: string;
  jobType: JobType;
  clientName: string;
  clientPhone: string;
  vehicleDetails: string;
  assetDetails: string;
  vehicleTierKey: VehicleTierKey | null;
  containerSize: ContainerSize;
  containerScope: ContainerScope;
  containerQuantity: number;
  serviceLocation: ServiceLocation;
  siteAddress: string;
  deposit: string;
  transcript: string;
  lines: DraftLine[];
}

export interface PricingConfig {
  rates: Readonly<Record<ContainerScope, ContainerScopeRate>>;
  mobilisationFeeCents: number | null;
}

export const DEFAULT_PRICING: PricingConfig = { rates: CONTAINER_SCOPE_RATES, mobilisationFeeCents: MOBILISATION_FEE_CENTS };

export type FieldErrorMap = Record<string, string>;

let lineCounter = 0;

export function newLineKey(): string {
  lineCounter += 1;
  return `line-${Math.random().toString(36).slice(2, 8)}-${lineCounter}`;
}

export function blankLine(): DraftLine {
  return { key: newLineKey(), auto: false, description: "", unit: "EACH", quantity: "1", unitPrice: "", tierKey: null };
}

export function createDraft(jobType: JobType, idempotencyKey: string): InvoiceDraft {
  return {
    idempotencyKey,
    jobType,
    clientName: "",
    clientPhone: "",
    vehicleDetails: "",
    assetDetails: "",
    vehicleTierKey: null,
    containerSize: "FT40",
    containerScope: "FLOOR_ONLY",
    containerQuantity: 1,
    serviceLocation: "ON_SITE",
    siteAddress: "",
    deposit: "",
    transcript: "",
    lines: [],
  };
}

function autoLines(draft: InvoiceDraft, pricing: PricingConfig): DraftLine[] {
  if (draft.jobType === "VEHICLE") {
    const tier = VEHICLE_TIERS.find((candidate) => candidate.key === draft.vehicleTierKey);
    if (!tier) {
      return [];
    }
    const suffix = draft.vehicleDetails.trim() ? ` - ${draft.vehicleDetails.trim()}` : "";
    return [
      {
        key: "auto-tier",
        auto: true,
        description: `${tier.label} coating${suffix}`,
        unit: "EACH",
        quantity: "1",
        unitPrice: tier.priceCents === null ? "" : centsToRandsString(tier.priceCents),
        tierKey: tier.key,
      },
    ];
  }

  if (draft.jobType === "CONTAINER") {
    const rate = pricing.rates[draft.containerScope];
    const areaHundredths = suggestedAreaHundredths(draft.containerSize, draft.containerScope);
    const areaMilli = areaHundredths === null ? null : hundredthsToMilli(areaHundredths) * draft.containerQuantity;
    const lines: DraftLine[] = [
      {
        key: "auto-area",
        auto: true,
        description: `${CONTAINER_SCOPE_LABELS[draft.containerScope]} - ${CONTAINER_SIZE_LABELS[draft.containerSize]} x ${draft.containerQuantity}`,
        unit: "SQM",
        quantity: areaMilli === null ? "" : formatMilli(areaMilli, "SQM"),
        unitPrice: rate.ratePerSqmCents === null ? "" : centsToRandsString(rate.ratePerSqmCents),
        tierKey: rate.key,
      },
    ];
    if (draft.serviceLocation === "ON_SITE" && pricing.mobilisationFeeCents !== null) {
      lines.push({
        key: "auto-mobilisation",
        auto: true,
        description: "On-site mobilisation",
        unit: "EACH",
        quantity: "1",
        unitPrice: centsToRandsString(pricing.mobilisationFeeCents),
        tierKey: null,
      });
    }
    return lines;
  }

  return [];
}

export function syncAutoLines(draft: InvoiceDraft, pricing: PricingConfig = DEFAULT_PRICING): InvoiceDraft {
  const manual = draft.lines.filter((line) => !line.auto);
  return { ...draft, lines: [...autoLines(draft, pricing), ...manual] };
}

export function applyParsedSpeech(
  draft: InvoiceDraft,
  parsed: ParsedSpeech,
  touched: ReadonlySet<string>,
  pricing: PricingConfig = DEFAULT_PRICING,
): InvoiceDraft {
  const next: InvoiceDraft = { ...draft };
  const free = (field: string): boolean => !touched.has(field);

  if (parsed.jobType && free("jobType")) {
    next.jobType = parsed.jobType;
  }
  if (parsed.clientName && free("clientName")) {
    next.clientName = parsed.clientName;
  }
  if (parsed.clientPhone && free("clientPhone")) {
    next.clientPhone = parsed.clientPhone;
  }
  if (parsed.depositCents !== null && free("deposit")) {
    next.deposit = centsToRandsString(parsed.depositCents);
  }
  if (parsed.vehicleLabel && free("vehicleDetails")) {
    next.vehicleDetails = parsed.vehicleLabel;
  }
  if (parsed.jobType === "VEHICLE" && parsed.tierKey && parsed.tierKey.startsWith("VEHICLE_") && free("vehicleTierKey")) {
    const tier = VEHICLE_TIERS.find((candidate) => candidate.key === parsed.tierKey);
    if (tier) {
      next.vehicleTierKey = tier.key;
    }
  }
  if (parsed.containerSize && free("containerSize")) {
    next.containerSize = parsed.containerSize;
  }
  if (parsed.containerScope && free("containerScope")) {
    next.containerScope = parsed.containerScope;
  }
  if (parsed.quantity !== null && free("containerQuantity")) {
    next.containerQuantity = parsed.quantity;
  }
  if (parsed.serviceLocation && free("serviceLocation")) {
    next.serviceLocation = parsed.serviceLocation;
  }

  return syncAutoLines(next, pricing);
}

interface ParsedLine {
  description: string;
  unit: LineUnit;
  quantityMilli: number;
  unitPriceCents: number;
  tierKey: TierKey | null;
}

function parseLines(draft: InvoiceDraft, errors: FieldErrorMap): ParsedLine[] {
  const parsed: ParsedLine[] = [];
  draft.lines.forEach((line, index) => {
    const quantityMilli = parseQuantityToMilli(line.quantity, line.unit);
    const unitPriceCents = parseRandsToCents(line.unitPrice);
    if (quantityMilli === null) {
      errors[`lines.${index}.quantityMilli`] = line.unit === "SQM" ? "Enter the area in m²" : "Enter a whole number";
    }
    if (unitPriceCents === null) {
      errors[`lines.${index}.unitPriceCents`] = "Enter a price in rands";
    }
    if (line.description.trim() === "") {
      errors[`lines.${index}.description`] = "Describe this line";
    }
    if (quantityMilli !== null && unitPriceCents !== null) {
      parsed.push({ description: line.description, unit: line.unit, quantityMilli, unitPriceCents, tierKey: line.tierKey });
    }
  });
  return parsed;
}

export interface DraftTotals {
  totals: InvoiceTotals | null;
  error: string | null;
}

export function draftTotals(draft: InvoiceDraft): DraftTotals {
  const errors: FieldErrorMap = {};
  const lines = parseLines(draft, errors);
  const depositCents = draft.deposit.trim() === "" ? 0 : parseRandsToCents(draft.deposit);
  if (depositCents === null) {
    return { totals: null, error: "Enter the deposit in rands" };
  }
  if (lines.length === 0) {
    return { totals: null, error: null };
  }
  try {
    return { totals: computeInvoiceTotals(lines, depositCents), error: null };
  } catch (error) {
    if (error instanceof MoneyRangeError) {
      return {
        totals: null,
        error: error.code === "DEPOSIT_EXCEEDS_TOTAL" ? "The deposit is more than the total" : "That amount is too large",
      };
    }
    throw error;
  }
}

export type PayloadResult =
  | { ok: true; payload: Record<string, unknown>; parsed: InvoiceInput }
  | { ok: false; errors: FieldErrorMap };

export function draftToPayload(draft: InvoiceDraft, status: "DRAFT" | "ISSUED"): PayloadResult {
  const errors: FieldErrorMap = {};
  const lines = parseLines(draft, errors);
  const depositCents = draft.deposit.trim() === "" ? 0 : parseRandsToCents(draft.deposit);
  if (depositCents === null) {
    errors.depositCents = "Enter the deposit in rands";
  }
  if (normalizeSaPhone(draft.clientPhone) === null) {
    errors.clientPhone = "Enter a valid South African phone number";
  }
  if (draft.lines.length === 0) {
    errors.lines = "Add at least one line";
  }

  const base = {
    idempotencyKey: draft.idempotencyKey,
    clientName: draft.clientName,
    clientPhone: draft.clientPhone,
    depositCents: depositCents ?? 0,
    status,
    ...(draft.transcript.trim() ? { rawVoiceTranscript: draft.transcript.trim().slice(0, 1000) } : {}),
    lines: lines.map((line) => ({
      description: line.description,
      unit: line.unit,
      quantityMilli: line.quantityMilli,
      unitPriceCents: line.unitPriceCents,
      ...(line.tierKey ? { tierKey: line.tierKey } : {}),
    })),
  };

  let payload: Record<string, unknown>;
  if (draft.jobType === "VEHICLE") {
    payload = { ...base, jobType: "VEHICLE", vehicleDetails: draft.vehicleDetails };
  } else if (draft.jobType === "CONTAINER") {
    payload = {
      ...base,
      jobType: "CONTAINER",
      containerSize: draft.containerSize,
      containerScope: draft.containerScope,
      containerQuantity: draft.containerQuantity,
      serviceLocation: draft.serviceLocation,
      siteAddress: draft.siteAddress,
      ...(draft.assetDetails.trim() ? { assetDetails: draft.assetDetails } : {}),
    };
  } else {
    payload = {
      ...base,
      jobType: "INDUSTRIAL",
      assetDetails: draft.assetDetails,
      ...(draft.siteAddress.trim() ? { siteAddress: draft.siteAddress } : {}),
    };
  }

  const result = invoiceInputSchema.safeParse(payload);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
      if (errors[key] === undefined) {
        errors[key] = issue.message;
      }
    }
  }
  if (Object.keys(errors).length > 0 || !result.success) {
    return { ok: false, errors };
  }
  return { ok: true, payload, parsed: result.data };
}

const draftLineSchema = z.object({
  key: z.string().max(60),
  auto: z.boolean(),
  description: z.string().max(300),
  unit: z.enum(LINE_UNITS),
  quantity: z.string().max(20),
  unitPrice: z.string().max(20),
  tierKey: z.enum(TIER_KEYS).nullable(),
});

const storedDraftSchema = z.object({
  draft: z.object({
    idempotencyKey: z.string().uuid(),
    jobType: z.enum(JOB_TYPES),
    clientName: z.string().max(200),
    clientPhone: z.string().max(40),
    vehicleDetails: z.string().max(300),
    assetDetails: z.string().max(300),
    vehicleTierKey: z.enum(TIER_KEYS).nullable(),
    containerSize: z.enum(CONTAINER_SIZES),
    containerScope: z.enum(CONTAINER_SCOPES),
    containerQuantity: z.number().int().min(1).max(50),
    serviceLocation: z.enum(SERVICE_LOCATIONS),
    siteAddress: z.string().max(300),
    deposit: z.string().max(20),
    transcript: z.string().max(1200),
    lines: z.array(draftLineSchema).max(30),
  }),
  touched: z.array(z.string().max(40)).max(40),
});

export interface StoredDraft {
  draft: InvoiceDraft;
  touched: string[];
}

export function serializeDraft(draft: InvoiceDraft, touched: ReadonlySet<string>): string {
  return JSON.stringify({ draft, touched: [...touched] });
}

export function restoreDraft(raw: string | null): StoredDraft | null {
  if (raw === null) {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = storedDraftSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }
  const { draft, touched } = parsed.data;
  const vehicleTierKey = VEHICLE_TIERS.find((tier) => tier.key === draft.vehicleTierKey)?.key ?? null;
  return { draft: { ...draft, vehicleTierKey }, touched };
}
