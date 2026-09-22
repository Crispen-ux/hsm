import { describe, expect, it } from "vitest";
import {
  invoiceInputSchema,
  leadInputSchema,
  parsedSpeechSchema,
  speechTranscriptSchema,
} from "@/lib/validations";

const uuid = "3f8f6f0e-7b0c-4c1a-9d3e-2b1f4a5c6d7e";

const vehicleLead = {
  fullName: "Sipho Nkosi",
  phone: "082 123 4567",
  serviceInterest: "FULL_VEHICLE",
  vehicleMake: "Toyota",
  vehicleModel: "Hilux",
  consent: true,
};

const containerLead = {
  fullName: "Thandi Mokoena",
  phone: "+27 82 123 4567",
  serviceInterest: "CONTAINER",
  containerSize: "FT40_HC",
  containerScope: "FULL_SHELL",
  containerQuantity: 2,
  serviceLocation: "ON_SITE",
  siteLocation: "Germiston",
  consent: true,
};

const vehicleInvoice = {
  jobType: "VEHICLE",
  idempotencyKey: uuid,
  clientName: "Sipho Nkosi",
  clientPhone: "0821234567",
  vehicleDetails: "Toyota Hilux double cab",
  depositCents: 50_000,
  lines: [
    {
      description: "Full bed and tailgate coating",
      unit: "EACH",
      quantityMilli: 1_000,
      unitPriceCents: 520_000,
      tierKey: "VEHICLE_FULL",
    },
  ],
};

const containerInvoice = {
  jobType: "CONTAINER",
  idempotencyKey: uuid,
  clientName: "Thandi Mokoena",
  clientPhone: "0821234567",
  containerSize: "FT20",
  containerScope: "FLOOR_ONLY",
  containerQuantity: 1,
  serviceLocation: "IN_YARD",
  siteAddress: "12 Main Reef Road, Germiston",
  lines: [
    {
      description: "Floor only 20ft",
      unit: "SQM",
      quantityMilli: 13_875,
      unitPriceCents: 12_345,
      tierKey: "CONTAINER_FLOOR_ONLY",
    },
  ],
};

describe("leadInputSchema", () => {
  it("accepts a vehicle lead and normalizes the phone", () => {
    const result = leadInputSchema.safeParse(vehicleLead);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+27821234567");
      expect(result.data.hasPhotos).toBe(false);
    }
  });

  it("accepts a container lead", () => {
    expect(leadInputSchema.safeParse(containerLead).success).toBe(true);
  });

  it("requires container fields when the service is CONTAINER", () => {
    const { containerSize: _size, ...missing } = containerLead;
    const result = leadInputSchema.safeParse(missing);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.containerSize).toBeDefined();
    }
  });

  it("forbids container fields on non-container services", () => {
    const result = leadInputSchema.safeParse({ ...vehicleLead, containerSize: "FT20" });
    expect(result.success).toBe(false);
  });

  it("caps container quantity between 1 and 50", () => {
    expect(leadInputSchema.safeParse({ ...containerLead, containerQuantity: 0 }).success).toBe(false);
    expect(leadInputSchema.safeParse({ ...containerLead, containerQuantity: 51 }).success).toBe(false);
    expect(leadInputSchema.safeParse({ ...containerLead, containerQuantity: 50 }).success).toBe(true);
  });

  it("rejects missing consent, a filled honeypot and bad phones", () => {
    expect(leadInputSchema.safeParse({ ...vehicleLead, consent: false }).success).toBe(false);
    expect(leadInputSchema.safeParse({ ...vehicleLead, website: "http://spam.example" }).success).toBe(false);
    expect(leadInputSchema.safeParse({ ...vehicleLead, phone: "12345" }).success).toBe(false);
  });

  it("strips markup from text fields", () => {
    const result = leadInputSchema.safeParse({ ...vehicleLead, message: "<b>Hello</b>\u0000 there" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Hello there");
    }
  });

  it("treats a blank optional email as absent and validates a real one", () => {
    const blank = leadInputSchema.safeParse({ ...vehicleLead, email: "  " });
    expect(blank.success && blank.data.email).toBeUndefined();
    expect(leadInputSchema.safeParse({ ...vehicleLead, email: "not-an-email" }).success).toBe(false);
    const valid = leadInputSchema.safeParse({ ...vehicleLead, email: "Sipho@Example.CO.ZA" });
    expect(valid.success && valid.data.email).toBe("sipho@example.co.za");
  });
});

describe("speechTranscriptSchema", () => {
  it("sanitizes and bounds input", () => {
    expect(speechTranscriptSchema.parse("  hilux <i>full</i>\n")).toBe("hilux full");
    expect(speechTranscriptSchema.safeParse("   ").success).toBe(false);
    expect(speechTranscriptSchema.safeParse("a".repeat(1_001)).success).toBe(false);
  });
});

describe("parsedSpeechSchema", () => {
  it("rejects out-of-range values", () => {
    const base = {
      jobType: null,
      vehicleLabel: null,
      tierKey: null,
      containerSize: null,
      containerScope: null,
      quantity: null,
      serviceLocation: null,
      depositCents: null,
      clientName: null,
      clientPhone: null,
      confidence: 0,
      unmatched: [],
      spans: [],
    };
    expect(parsedSpeechSchema.safeParse(base).success).toBe(true);
    expect(parsedSpeechSchema.safeParse({ ...base, quantity: 51 }).success).toBe(false);
    expect(parsedSpeechSchema.safeParse({ ...base, depositCents: 1.5 }).success).toBe(false);
    expect(parsedSpeechSchema.safeParse({ ...base, clientPhone: "0821234567" }).success).toBe(false);
  });
});

describe("invoiceInputSchema", () => {
  it("accepts vehicle and container invoices", () => {
    expect(invoiceInputSchema.safeParse(vehicleInvoice).success).toBe(true);
    expect(invoiceInputSchema.safeParse(containerInvoice).success).toBe(true);
  });

  it("rejects client-supplied totals", () => {
    expect(invoiceInputSchema.safeParse({ ...vehicleInvoice, totalCents: 1 }).success).toBe(false);
    expect(invoiceInputSchema.safeParse({ ...vehicleInvoice, subtotalCents: 1 }).success).toBe(false);
    const withLineTotal = {
      ...vehicleInvoice,
      lines: [{ ...vehicleInvoice.lines[0], lineTotalCents: 1 }],
    };
    expect(invoiceInputSchema.safeParse(withLineTotal).success).toBe(false);
  });

  it("rejects fractional cents and quantities", () => {
    const fractionalPrice = { ...vehicleInvoice, lines: [{ ...vehicleInvoice.lines[0], unitPriceCents: 10.5 }] };
    const fractionalQuantity = { ...vehicleInvoice, lines: [{ ...vehicleInvoice.lines[0], quantityMilli: 1.5 }] };
    expect(invoiceInputSchema.safeParse(fractionalPrice).success).toBe(false);
    expect(invoiceInputSchema.safeParse(fractionalQuantity).success).toBe(false);
  });

  it("blocks container tiers on vehicle invoices and the reverse", () => {
    const wrongOnVehicle = {
      ...vehicleInvoice,
      lines: [{ ...vehicleInvoice.lines[0], tierKey: "CONTAINER_FULL_SHELL" }],
    };
    const wrongOnContainer = {
      ...containerInvoice,
      lines: [{ ...containerInvoice.lines[0], tierKey: "VEHICLE_FULL" }],
    };
    expect(invoiceInputSchema.safeParse(wrongOnVehicle).success).toBe(false);
    expect(invoiceInputSchema.safeParse(wrongOnContainer).success).toBe(false);
  });

  it("rejects a deposit larger than the total", () => {
    const result = invoiceInputSchema.safeParse({ ...vehicleInvoice, depositCents: 700_000 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("depositCents"))).toBe(true);
    }
  });

  it("requires job-specific fields and forbids the wrong ones", () => {
    const { vehicleDetails: _details, ...noVehicle } = vehicleInvoice;
    expect(invoiceInputSchema.safeParse(noVehicle).success).toBe(false);
    expect(invoiceInputSchema.safeParse({ ...vehicleInvoice, containerSize: "FT20" }).success).toBe(false);
  });

  it("requires a valid idempotency key and at least one line", () => {
    expect(invoiceInputSchema.safeParse({ ...vehicleInvoice, idempotencyKey: "nope" }).success).toBe(false);
    expect(invoiceInputSchema.safeParse({ ...vehicleInvoice, lines: [] }).success).toBe(false);
  });

  it("accepts industrial invoices without tier keys", () => {
    const industrial = {
      jobType: "INDUSTRIAL",
      idempotencyKey: uuid,
      clientName: "Plant Co",
      clientPhone: "0111234567",
      assetDetails: "Tanker deck 12m",
      lines: [{ description: "Deck coating", unit: "SQM", quantityMilli: 20_000, unitPriceCents: 9_000 }],
    };
    expect(invoiceInputSchema.safeParse(industrial).success).toBe(true);
  });
});
