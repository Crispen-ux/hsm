import { describe, expect, it } from "vitest";
import { normalizeTranscript, parseSpeech } from "@/lib/speech-parser";
import { parsedSpeechSchema } from "@/lib/validations";

describe("normalizeTranscript", () => {
  it.each([
    ["one hundred and fifty", "150"],
    ["forty five", "45"],
    ["two forty foot", "2 40 foot"],
    ["ten thousand", "10000"],
    ["five hundred", "500"],
    ["twenty thousand five hundred", "20500"],
    ["twelve metre", "12 metre"],
    ["zero eight two one two three four five six seven", "0821234567"],
    ["Thándi's Hilux", "thandi s hilux"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeTranscript(input)).toBe(expected);
  });
});

describe("parseSpeech: containers", () => {
  it("parses the reference voice line", () => {
    const parsed = parseSpeech(
      "Two forty foot high cubes, full shell, client John Dlamini, deposit of ten thousand",
    );
    expect(parsed.jobType).toBe("CONTAINER");
    expect(parsed.containerSize).toBe("FT40_HC");
    expect(parsed.containerScope).toBe("FULL_SHELL");
    expect(parsed.quantity).toBe(2);
    expect(parsed.depositCents).toBe(1_000_000);
    expect(parsed.clientName).toBe("John Dlamini");
    expect(parsed.tierKey).toBe("CONTAINER_FULL_SHELL");
    expect(parsed.confidence).toBe(100);
    expect(parsed.unmatched).toEqual([]);
  });

  it("never resolves a high cube as a plain 40ft", () => {
    const parsed = parseSpeech("forty foot high cube floor only");
    expect(parsed.containerSize).toBe("FT40_HC");
    expect(parsed.containerScope).toBe("FLOOR_ONLY");
  });

  it("parses quantity, size and interior scope", () => {
    const parsed = parseSpeech("three forty foot containers inside only");
    expect(parsed.containerSize).toBe("FT40");
    expect(parsed.quantity).toBe(3);
    expect(parsed.containerScope).toBe("INTERIOR_FULL");
  });

  it("parses exterior scope, location and spoken deposit", () => {
    const parsed = parseSpeech("twenty foot container outside on site deposit five hundred");
    expect(parsed.containerSize).toBe("FT20");
    expect(parsed.containerScope).toBe("EXTERIOR_ONLY");
    expect(parsed.serviceLocation).toBe("ON_SITE");
    expect(parsed.depositCents).toBe(50_000);
  });

  it("recognises metre phrasing and yard drop-off", () => {
    const parsed = parseSpeech("twelve metre container floor, client will drop off in the yard");
    expect(parsed.containerSize).toBe("FT40");
    expect(parsed.serviceLocation).toBe("IN_YARD");
  });

  it("supports a trailing quantity", () => {
    const parsed = parseSpeech("forty foot container floor only, 4 containers");
    expect(parsed.quantity).toBe(4);
    expect(parsed.containerSize).toBe("FT40");
  });

  it("rejects quantities above 50", () => {
    expect(parseSpeech("sixty forty foot containers floor").quantity).toBeNull();
  });

  it("keeps the vehicle Full tier out of container jobs", () => {
    const parsed = parseSpeech("forty foot container full");
    expect(parsed.containerScope).toBe("FULL_SHELL");
    expect(parsed.tierKey).toBe("CONTAINER_FULL_SHELL");
  });

  it("surfaces unmatched fragments", () => {
    const parsed = parseSpeech("container banana split");
    expect(parsed.jobType).toBe("CONTAINER");
    expect(parsed.unmatched).toEqual(["banana split"]);
    expect(parsed.confidence).toBe(0);
  });
});

describe("parseSpeech: vehicles", () => {
  it("parses a Hilux Full with spoken phone digits", () => {
    const parsed = parseSpeech("Hilux full, client Sipho, zero eight two one two three four five six seven");
    expect(parsed.jobType).toBe("VEHICLE");
    expect(parsed.vehicleLabel).toBe("Toyota Hilux");
    expect(parsed.tierKey).toBe("VEHICLE_FULL");
    expect(parsed.clientName).toBe("Sipho");
    expect(parsed.clientPhone).toBe("+27821234567");
    expect(parsed.confidence).toBe(100);
  });

  it.each([
    ["hi lux full", "Toyota Hilux"],
    ["high lux full", "Toyota Hilux"],
    ["ford ranger full", "Ford Ranger"],
    ["d max full", "Isuzu D-Max"],
    ["land cruiser full", "Toyota Land Cruiser"],
  ])("maps %s", (input, label) => {
    expect(parseSpeech(input).vehicleLabel).toBe(label);
  });

  it("reads a digit phone number and a rand deposit", () => {
    const parsed = parseSpeech("Hilux full 082 123 4567 deposit R5 000");
    expect(parsed.clientPhone).toBe("+27821234567");
    expect(parsed.depositCents).toBe(500_000);
  });

  it("reads a deposit stated before the keyword", () => {
    expect(parseSpeech("hilux full R500 deposit").depositCents).toBe(50_000);
  });
});

describe("parseSpeech: general", () => {
  it("returns an empty result for empty input", () => {
    const parsed = parseSpeech("   ");
    expect(parsed.jobType).toBeNull();
    expect(parsed.confidence).toBe(0);
    expect(parsed.unmatched).toEqual([]);
  });

  it("detects industrial work", () => {
    expect(parseSpeech("industrial tank lining").jobType).toBe("INDUSTRIAL");
  });

  it("always produces output that satisfies the schema", () => {
    const samples = [
      "Two forty foot high cubes, full shell, client John Dlamini, deposit of ten thousand",
      "Hilux full, client Sipho, zero eight two one two three four five six seven",
      "random words with no meaning",
      "",
      "<script>alert(1)</script> forty foot container floor",
    ];
    for (const sample of samples) {
      expect(parsedSpeechSchema.safeParse(parseSpeech(sample)).success).toBe(true);
    }
  });
});
