import { z } from "zod";
import {
  CONTAINER_SCOPES,
  CONTAINER_SIZES,
  INVOICE_STATUSES,
  JOB_TYPES,
  LINE_UNITS,
  NON_CONTAINER_INTERESTS,
  SERVICE_LOCATIONS,
  SPAN_KINDS,
} from "@/lib/domain";
import { computeInvoiceTotals, MAX_CENTS, MoneyRangeError } from "@/lib/money";
import { normalizeSaPhone } from "@/lib/phone";
import { TIER_KEYS, tierJobType } from "@/lib/pricing-tiers";
import { sanitizeText } from "@/lib/sanitize";

export const jobTypeSchema = z.enum(JOB_TYPES);
export const containerSizeSchema = z.enum(CONTAINER_SIZES);
export const containerScopeSchema = z.enum(CONTAINER_SCOPES);
export const serviceLocationSchema = z.enum(SERVICE_LOCATIONS);
export const lineUnitSchema = z.enum(LINE_UNITS);
export const tierKeySchema = z.enum(TIER_KEYS);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_UNIT_PRICE_CENTS = 2_000_000_000;
const MAX_QUANTITY_MILLI = 1_000_000;
const MAX_INVOICE_LINES = 30;
const MAX_TRANSCRIPT_LENGTH = 1_000;

function requiredText(min: number, max: number, label: string) {
  return z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .transform((value, ctx) => {
      const cleaned = sanitizeText(value);
      if (cleaned.length < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`,
        });
        return z.NEVER;
      }
      if (cleaned.length > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be at most ${max} characters` });
        return z.NEVER;
      }
      return cleaned;
    });
}

function optionalText(max: number, label: string) {
  return z
    .string()
    .optional()
    .transform((value, ctx) => {
      if (value === undefined) {
        return undefined;
      }
      const cleaned = sanitizeText(value);
      if (cleaned === "") {
        return undefined;
      }
      if (cleaned.length > max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be at most ${max} characters` });
        return z.NEVER;
      }
      return cleaned;
    });
}

const optionalEmail = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined) {
      return undefined;
    }
    const cleaned = sanitizeText(value).toLowerCase();
    if (cleaned === "") {
      return undefined;
    }
    if (cleaned.length > 254 || !EMAIL_PATTERN.test(cleaned)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email address" });
      return z.NEVER;
    }
    return cleaned;
  });

export const saPhoneSchema = z
  .string({ required_error: "Phone number is required", invalid_type_error: "Phone number is required" })
  .transform((value, ctx) => {
    const normalized = normalizeSaPhone(value);
    if (normalized === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid South African phone number" });
      return z.NEVER;
    }
    return normalized;
  });

const centsSchema = z.number().int().min(0).max(MAX_CENTS);
const containerQuantitySchema = z.number().int().min(1).max(50);

const leadBaseSchema = z.object({
  fullName: requiredText(2, 120, "Full name"),
  phone: saPhoneSchema,
  email: optionalEmail,
  message: optionalText(1_000, "Message"),
  hasPhotos: z.boolean().default(false),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required to submit this form" }) }),
  website: z.string().max(0).default(""),
});

const nonContainerLeadSchema = leadBaseSchema.extend({
  serviceInterest: z.enum(NON_CONTAINER_INTERESTS),
  vehicleMake: optionalText(60, "Vehicle make"),
  vehicleModel: optionalText(60, "Vehicle model"),
  containerSize: z.undefined(),
  containerScope: z.undefined(),
  containerQuantity: z.undefined(),
  serviceLocation: z.undefined(),
  siteLocation: z.undefined(),
  siteAccessNotes: z.undefined(),
});

const containerLeadSchema = leadBaseSchema.extend({
  serviceInterest: z.literal("CONTAINER"),
  containerSize: containerSizeSchema,
  containerScope: containerScopeSchema,
  containerQuantity: containerQuantitySchema,
  serviceLocation: serviceLocationSchema,
  siteLocation: requiredText(2, 120, "Site location"),
  siteAccessNotes: optionalText(500, "Access notes"),
  vehicleMake: z.undefined(),
  vehicleModel: z.undefined(),
});

export const leadInputSchema = z.discriminatedUnion("serviceInterest", [
  nonContainerLeadSchema,
  containerLeadSchema,
]);

export type LeadInput = z.output<typeof leadInputSchema>;
export type LeadFormInput = z.input<typeof leadInputSchema>;

export const speechTranscriptSchema = requiredText(1, MAX_TRANSCRIPT_LENGTH, "Transcript");
export type SpeechTranscript = z.output<typeof speechTranscriptSchema>;

export const parsedSpanSchema = z.object({
  kind: z.enum(SPAN_KINDS),
  text: z.string().max(200),
});

export const parsedSpeechSchema = z.object({
  jobType: jobTypeSchema.nullable(),
  vehicleLabel: z.string().max(80).nullable(),
  tierKey: tierKeySchema.nullable(),
  containerSize: containerSizeSchema.nullable(),
  containerScope: containerScopeSchema.nullable(),
  quantity: containerQuantitySchema.nullable(),
  serviceLocation: serviceLocationSchema.nullable(),
  depositCents: centsSchema.nullable(),
  clientName: z.string().max(120).nullable(),
  clientPhone: z
    .string()
    .regex(/^\+27[1-8]\d{8}$/)
    .nullable(),
  confidence: z.number().int().min(0).max(100),
  unmatched: z.array(z.string().max(200)).max(50),
  spans: z.array(parsedSpanSchema).max(50),
});

export type ParsedSpeech = z.output<typeof parsedSpeechSchema>;
export type ParsedSpan = z.output<typeof parsedSpanSchema>;

export const invoiceLineSchema = z
  .object({
    description: requiredText(1, 200, "Description"),
    unit: lineUnitSchema,
    quantityMilli: z.number().int().min(1).max(MAX_QUANTITY_MILLI),
    unitPriceCents: z.number().int().min(0).max(MAX_UNIT_PRICE_CENTS),
    tierKey: tierKeySchema.optional(),
  })
  .strict();

export type InvoiceLineInput = z.output<typeof invoiceLineSchema>;

const invoiceBaseSchema = z.object({
  idempotencyKey: z.string().uuid(),
  clientName: requiredText(2, 120, "Client name"),
  clientPhone: saPhoneSchema,
  rawVoiceTranscript: optionalText(MAX_TRANSCRIPT_LENGTH, "Transcript"),
  depositCents: centsSchema.default(0),
  status: z.enum(["DRAFT", "ISSUED"]).default("DRAFT"),
  lines: z.array(invoiceLineSchema).min(1).max(MAX_INVOICE_LINES),
});

const vehicleInvoiceSchema = invoiceBaseSchema
  .extend({
    jobType: z.literal("VEHICLE"),
    vehicleDetails: requiredText(2, 200, "Vehicle details"),
    assetDetails: z.undefined(),
    containerSize: z.undefined(),
    containerScope: z.undefined(),
    containerQuantity: z.undefined(),
    serviceLocation: z.undefined(),
    siteAddress: z.undefined(),
  })
  .strict();

const containerInvoiceSchema = invoiceBaseSchema
  .extend({
    jobType: z.literal("CONTAINER"),
    containerSize: containerSizeSchema,
    containerScope: containerScopeSchema,
    containerQuantity: containerQuantitySchema,
    serviceLocation: serviceLocationSchema,
    siteAddress: requiredText(3, 200, "Site address"),
    assetDetails: optionalText(200, "Asset details"),
    vehicleDetails: z.undefined(),
  })
  .strict();

const industrialInvoiceSchema = invoiceBaseSchema
  .extend({
    jobType: z.literal("INDUSTRIAL"),
    assetDetails: requiredText(2, 200, "Asset details"),
    siteAddress: optionalText(200, "Site address"),
    vehicleDetails: z.undefined(),
    containerSize: z.undefined(),
    containerScope: z.undefined(),
    containerQuantity: z.undefined(),
    serviceLocation: z.undefined(),
  })
  .strict();

export const invoiceInputSchema = z
  .discriminatedUnion("jobType", [vehicleInvoiceSchema, containerInvoiceSchema, industrialInvoiceSchema])
  .superRefine((invoice, ctx) => {
    invoice.lines.forEach((line, index) => {
      if (line.tierKey !== undefined && tierJobType(line.tierKey) !== invoice.jobType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", index, "tierKey"],
          message: `Tier ${line.tierKey} cannot be used on a ${invoice.jobType.toLowerCase()} invoice`,
        });
      }
    });

    try {
      computeInvoiceTotals(invoice.lines, invoice.depositCents);
    } catch (error) {
      if (!(error instanceof MoneyRangeError)) {
        throw error;
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: error.code === "DEPOSIT_EXCEEDS_TOTAL" ? ["depositCents"] : ["lines"],
        message:
          error.code === "DEPOSIT_EXCEEDS_TOTAL"
            ? "Deposit cannot exceed the invoice total"
            : "Invoice amount is outside the supported range",
      });
    }
  });

export type InvoiceInput = z.output<typeof invoiceInputSchema>;
export type InvoiceFormInput = z.input<typeof invoiceInputSchema>;

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .transform((value) => sanitizeText(value).toLowerCase())
    .pipe(z.string().min(3, "Email is required").max(254).regex(EMAIL_PATTERN, "Enter a valid email address")),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required").max(200),
});

export type LoginInput = z.output<typeof loginSchema>;

export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);

export const invoiceStatusUpdateSchema = z
  .object({
    id: z.string().min(1).max(40),
    status: invoiceStatusSchema,
  })
  .strict();

export type InvoiceStatusUpdateInput = z.output<typeof invoiceStatusUpdateSchema>;

export const listInvoicesQuerySchema = z
  .object({
    limit: z.number().int().min(1).max(50).default(20),
    cursor: z.string().min(1).max(40).optional(),
    status: invoiceStatusSchema.optional(),
  })
  .strict();

export type ListInvoicesQuery = z.output<typeof listInvoicesQuerySchema>;
