import { describe, expect, it } from "vitest";
import { indicativeContainerQuote, type ContainerQuoteConfig } from "@/lib/container-quote";
import { formatSqm, suggestedAreaHundredths, suggestedAreaMilli } from "@/lib/container-specs";
import { CONTAINER_SCOPE_RATES } from "@/lib/pricing-tiers";

const configured: ContainerQuoteConfig = {
  rates: {
    FLOOR_ONLY: { ...CONTAINER_SCOPE_RATES.FLOOR_ONLY, ratePerSqmCents: 10_000 },
    INTERIOR_FULL: { ...CONTAINER_SCOPE_RATES.INTERIOR_FULL, ratePerSqmCents: 8_000 },
    EXTERIOR_ONLY: { ...CONTAINER_SCOPE_RATES.EXTERIOR_ONLY, ratePerSqmCents: 7_500 },
    FULL_SHELL: { ...CONTAINER_SCOPE_RATES.FULL_SHELL, ratePerSqmCents: 9_000 },
  },
  mobilisationFeeCents: 50_000,
};

describe("container specs", () => {
  it("maps scopes to areas", () => {
    expect(suggestedAreaHundredths("FT20", "FLOOR_ONLY")).toBe(1_390);
    expect(suggestedAreaHundredths("FT40_HC", "INTERIOR_FULL")).toBe(13_300);
    expect(suggestedAreaMilli("FT40", "FLOOR_ONLY")).toBe(28_300);
  });

  it("returns null where the area is unknown", () => {
    expect(suggestedAreaHundredths("OTHER", "FLOOR_ONLY")).toBeNull();
    expect(suggestedAreaHundredths("FT20", "EXTERIOR_ONLY")).toBeNull();
    expect(suggestedAreaHundredths("FT20", "FULL_SHELL")).toBeNull();
  });
});

describe("indicativeContainerQuote", () => {
  it("returns null while operator rates are unset", () => {
    expect(
      indicativeContainerQuote({ size: "FT20", scope: "FLOOR_ONLY", quantity: 1, location: "IN_YARD" }),
    ).toBeNull();
  });

  it("prices floor area with integer maths", () => {
    const quote = indicativeContainerQuote(
      { size: "FT20", scope: "FLOOR_ONLY", quantity: 2, location: "IN_YARD" },
      configured,
    );
    expect(quote?.lines).toHaveLength(1);
    expect(quote?.lines[0]?.quantityMilli).toBe(27_800);
    expect(quote?.lines[0]?.lineTotalCents).toBe(278_000);
    expect(quote?.subtotalCents).toBe(278_000);
    expect(quote?.totalCents).toBe(278_000);
  });

  it("adds mobilisation only for on-site work", () => {
    const onSite = indicativeContainerQuote(
      { size: "FT20", scope: "FLOOR_ONLY", quantity: 1, location: "ON_SITE" },
      configured,
    );
    const inYard = indicativeContainerQuote(
      { size: "FT20", scope: "FLOOR_ONLY", quantity: 1, location: "IN_YARD" },
      configured,
    );
    expect(onSite?.lines).toHaveLength(2);
    expect(onSite?.subtotalCents).toBe(139_000 + 50_000);
    expect(inYard?.lines).toHaveLength(1);
  });

  it("rejects invalid quantities and unknown areas", () => {
    expect(
      indicativeContainerQuote({ size: "FT20", scope: "FLOOR_ONLY", quantity: 0, location: "IN_YARD" }, configured),
    ).toBeNull();
    expect(
      indicativeContainerQuote({ size: "FT20", scope: "FLOOR_ONLY", quantity: 51, location: "IN_YARD" }, configured),
    ).toBeNull();
    expect(
      indicativeContainerQuote({ size: "FT20", scope: "EXTERIOR_ONLY", quantity: 1, location: "IN_YARD" }, configured),
    ).toBeNull();
  });
});

describe("formatSqm", () => {
  it.each([
    [13_900, "13.9 m\u00B2"],
    [28_300, "28.3 m\u00B2"],
    [13_875, "13.9 m\u00B2"],
    [500, "0.5 m\u00B2"],
    [267_000, "267.0 m\u00B2"],
  ])("formats %s milli as %s", (milli, expected) => {
    expect(formatSqm(milli)).toBe(expected);
  });
});
