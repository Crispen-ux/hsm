import { describe, expect, it } from "vitest";
import {
  applyParsedSpeech,
  blankLine,
  createDraft,
  draftToPayload,
  draftTotals,
  restoreDraft,
  serializeDraft,
  syncAutoLines,
  type InvoiceDraft,
  type PricingConfig,
} from "@/lib/invoice-draft";
import { CONTAINER_SCOPE_RATES } from "@/lib/pricing-tiers";
import { parseSpeech } from "@/lib/speech-parser";

const KEY = "3f8f6f0e-7b0c-4c1a-9d3e-2b1f4a5c6d7e";
const NONE: ReadonlySet<string> = new Set();

const configured: PricingConfig = {
  rates: {
    FLOOR_ONLY: { ...CONTAINER_SCOPE_RATES.FLOOR_ONLY, ratePerSqmCents: 10_000 },
    INTERIOR_FULL: { ...CONTAINER_SCOPE_RATES.INTERIOR_FULL, ratePerSqmCents: 8_000 },
    EXTERIOR_ONLY: { ...CONTAINER_SCOPE_RATES.EXTERIOR_ONLY, ratePerSqmCents: 7_500 },
    FULL_SHELL: { ...CONTAINER_SCOPE_RATES.FULL_SHELL, ratePerSqmCents: 9_000 },
  },
  mobilisationFeeCents: 50_000,
};

function fromSpeech(text: string, touched: ReadonlySet<string> = NONE, pricing?: PricingConfig): InvoiceDraft {
  return applyParsedSpeech(createDraft("VEHICLE", KEY), parseSpeech(text), touched, pricing);
}

describe("applyParsedSpeech: vehicles", () => {
  it("prefills a Hilux Full job with the R5,200 tier line", () => {
    const draft = fromSpeech("Hilux full, client Sipho, zero eight two one two three four five six seven, deposit of five hundred");
    expect(draft.jobType).toBe("VEHICLE");
    expect(draft.vehicleDetails).toBe("Toyota Hilux");
    expect(draft.clientName).toBe("Sipho");
    expect(draft.clientPhone).toBe("+27821234567");
    expect(draft.deposit).toBe("500.00");
    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0]).toMatchObject({
      auto: true,
      unit: "EACH",
      quantity: "1",
      unitPrice: "5200.00",
      tierKey: "VEHICLE_FULL",
      description: "Full coating - Toyota Hilux",
    });
  });

  it("never overwrites a field the crew has edited", () => {
    const draft = applyParsedSpeech(
      { ...createDraft("VEHICLE", KEY), clientName: "Corrected Name" },
      parseSpeech("Hilux full, client Sipho"),
      new Set(["clientName"]),
    );
    expect(draft.clientName).toBe("Corrected Name");
    expect(draft.vehicleDetails).toBe("Toyota Hilux");
  });
});

describe("applyParsedSpeech: containers", () => {
  const spoken = "Two forty foot high cubes, full shell, client John Dlamini, deposit of ten thousand";

  it("switches to a container job and fills size, scope, quantity and deposit", () => {
    const draft = fromSpeech(spoken, NONE, configured);
    expect(draft).toMatchObject({
      jobType: "CONTAINER",
      containerSize: "FT40_HC",
      containerScope: "FULL_SHELL",
      containerQuantity: 2,
      clientName: "John Dlamini",
      deposit: "10000.00",
    });
  });

  it("leaves area blank when the exterior area is unknown rather than guessing", () => {
    const draft = fromSpeech(spoken, NONE, configured);
    expect(draft.lines[0]).toMatchObject({ unit: "SQM", quantity: "", unitPrice: "90.00", tierKey: "CONTAINER_FULL_SHELL" });
  });

  it("suggests area and rate when both are known", () => {
    const draft = fromSpeech("twenty foot container floor only on site", NONE, configured);
    expect(draft.lines).toHaveLength(2);
    expect(draft.lines[0]).toMatchObject({ quantity: "13.9", unitPrice: "100.00", unit: "SQM" });
    expect(draft.lines[1]).toMatchObject({ description: "On-site mobilisation", unitPrice: "500.00" });
  });

  it("omits mobilisation for yard work", () => {
    const draft = fromSpeech("twenty foot container floor only in the yard", NONE, configured);
    expect(draft.lines).toHaveLength(1);
  });

  it("leaves prices blank while operator rates are unset", () => {
    const draft = fromSpeech("twenty foot container floor only");
    expect(draft.lines[0]).toMatchObject({ quantity: "13.9", unitPrice: "" });
  });
});

describe("syncAutoLines", () => {
  it("keeps crew-owned lines and replaces auto lines", () => {
    const owned = { ...blankLine(), description: "Extra prep", quantity: "1", unitPrice: "150.00" };
    const draft = syncAutoLines(
      { ...createDraft("CONTAINER", KEY), containerScope: "INTERIOR_FULL", lines: [{ ...owned }] },
      configured,
    );
    expect(draft.lines.map((line) => line.description)).toContain("Extra prep");
    expect(draft.lines[0]?.auto).toBe(true);
    const again = syncAutoLines({ ...draft, containerScope: "FLOOR_ONLY" }, configured);
    expect(again.lines.filter((line) => line.auto)).toHaveLength(2);
    expect(again.lines.filter((line) => !line.auto)).toHaveLength(1);
  });
});

describe("draftTotals", () => {
  it("computes VAT and balance with integer maths", () => {
    const draft = fromSpeech("Hilux full deposit five hundred");
    const { totals, error } = draftTotals(draft);
    expect(error).toBeNull();
    expect(totals).toMatchObject({ subtotalCents: 520_000, vatCents: 78_000, totalCents: 598_000, depositCents: 50_000, balanceCents: 548_000 });
  });

  it("reports a deposit above the total", () => {
    const draft = { ...fromSpeech("Hilux full"), deposit: "9000" };
    expect(draftTotals(draft).error).toBe("The deposit is more than the total");
  });

  it("returns no totals until a line is priced", () => {
    expect(draftTotals(createDraft("VEHICLE", KEY)).totals).toBeNull();
    expect(draftTotals({ ...createDraft("VEHICLE", KEY), lines: [{ ...blankLine(), unitPrice: "" }] }).totals).toBeNull();
  });

  it("reproduces the fractional-area total the server computes", () => {
    const draft: InvoiceDraft = {
      ...createDraft("CONTAINER", KEY),
      lines: [{ ...blankLine(), description: "Floor", unit: "SQM", quantity: "13.875", unitPrice: "123.45" }],
    };
    expect(draftTotals(draft).totals).toMatchObject({ subtotalCents: 171_287, vatCents: 25_693 });
  });
});

describe("draftToPayload", () => {
  function completeVehicle(): InvoiceDraft {
    return { ...fromSpeech("Hilux full client Sipho 082 123 4567"), clientName: "Sipho Nkosi" };
  }

  it("builds a payload the server schema accepts", () => {
    const result = draftToPayload(completeVehicle(), "ISSUED");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parsed.jobType).toBe("VEHICLE");
      expect(result.parsed.status).toBe("ISSUED");
      expect(result.payload).not.toHaveProperty("totalCents");
      expect(result.payload).toMatchObject({ idempotencyKey: KEY, clientPhone: "+27821234567", depositCents: 0 });
    }
  });

  it("stores the spoken transcript with the invoice", () => {
    const result = draftToPayload({ ...completeVehicle(), transcript: "Hilux full client Sipho" }, "DRAFT");
    expect(result.ok && result.payload.rawVoiceTranscript).toBe("Hilux full client Sipho");
  });

  it("reports field errors instead of a payload", () => {
    const result = draftToPayload({ ...completeVehicle(), clientPhone: "12345", clientName: "" }, "ISSUED");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.clientPhone).toBeDefined();
      expect(result.errors.clientName).toBeDefined();
    }
  });

  it("requires a line, and valid quantities and prices on each line", () => {
    const empty = draftToPayload({ ...completeVehicle(), lines: [] }, "DRAFT");
    expect(!empty.ok && empty.errors.lines).toBeDefined();

    const bad = draftToPayload({ ...completeVehicle(), lines: [{ ...blankLine(), description: "X", quantity: "abc", unitPrice: "12x" }] }, "DRAFT");
    expect(!bad.ok && bad.errors["lines.0.quantityMilli"]).toBeDefined();
    expect(!bad.ok && bad.errors["lines.0.unitPriceCents"]).toBeDefined();
  });

  it("rejects a container tier on a vehicle job via the shared schema", () => {
    const draft = completeVehicle();
    const first = draft.lines[0];
    if (!first) {
      throw new Error("expected a line");
    }
    const result = draftToPayload({ ...draft, lines: [{ ...first, tierKey: "CONTAINER_FULL_SHELL" }] }, "DRAFT");
    expect(result.ok).toBe(false);
  });

  it("builds a valid container payload", () => {
    const draft: InvoiceDraft = {
      ...createDraft("CONTAINER", KEY),
      clientName: "Thandi Mokoena",
      clientPhone: "0821234567",
      siteAddress: "12 Main Reef Road, Germiston",
      lines: [{ ...blankLine(), description: "Floor 20ft", unit: "SQM", quantity: "13.875", unitPrice: "123.45", tierKey: "CONTAINER_FLOOR_ONLY" }],
    };
    const result = draftToPayload(draft, "DRAFT");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parsed.jobType).toBe("CONTAINER");
    }
  });
});

describe("draft persistence", () => {
  it("round-trips a draft and its touched fields", () => {
    const draft = fromSpeech("Hilux full client Sipho");
    const restored = restoreDraft(serializeDraft(draft, new Set(["clientName"])));
    expect(restored?.draft).toEqual(draft);
    expect(restored?.touched).toEqual(["clientName"]);
  });

  it("returns null for missing, corrupt or tampered data instead of throwing", () => {
    expect(restoreDraft(null)).toBeNull();
    expect(restoreDraft("{not json")).toBeNull();
    expect(restoreDraft("[]")).toBeNull();
    expect(restoreDraft(JSON.stringify({ draft: { jobType: "HACK" }, touched: [] }))).toBeNull();
    const valid = JSON.parse(serializeDraft(createDraft("VEHICLE", KEY), new Set()));
    valid.draft.containerQuantity = "3";
    expect(restoreDraft(JSON.stringify(valid))).toBeNull();
    valid.draft.containerQuantity = 3;
    valid.draft.idempotencyKey = "not-a-uuid";
    expect(restoreDraft(JSON.stringify(valid))).toBeNull();
  });

  it("drops a vehicle tier key that no longer exists", () => {
    const valid = JSON.parse(serializeDraft(createDraft("VEHICLE", KEY), new Set()));
    valid.draft.vehicleTierKey = "CONTAINER_FULL_SHELL";
    expect(restoreDraft(JSON.stringify(valid))?.draft.vehicleTierKey).toBeNull();
  });
});
