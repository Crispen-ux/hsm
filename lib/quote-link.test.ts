import { describe, expect, it } from "vitest";
import { buildQuoteHref, parseQuotePrefill } from "@/lib/quote-link";

describe("quote links", () => {
  it("builds a link that parses back to the same selection", () => {
    const href = buildQuoteHref({ service: "CONTAINER", size: "FT40_HC", scope: "FULL_SHELL", quantity: 3, location: "ON_SITE" });
    expect(href).toBe("/?service=CONTAINER&size=FT40_HC&scope=FULL_SHELL&qty=3&location=ON_SITE#quote");
    const search = href.slice(1, href.indexOf("#"));
    expect(parseQuotePrefill(search)).toEqual({
      service: "CONTAINER",
      size: "FT40_HC",
      scope: "FULL_SHELL",
      quantity: 3,
      location: "ON_SITE",
    });
  });

  it("links to the bare form when nothing is selected", () => {
    expect(buildQuoteHref({})).toBe("/#quote");
  });

  it("ignores unknown, malformed and out-of-range values", () => {
    expect(parseQuotePrefill("service=HACK&size=FT99&scope=X&qty=500&location=MOON")).toEqual({});
    expect(parseQuotePrefill("qty=-2")).toEqual({});
    expect(parseQuotePrefill("qty=0")).toEqual({});
    expect(parseQuotePrefill("qty=2.5")).toEqual({});
    expect(parseQuotePrefill("size=FT20&qty=50")).toEqual({ size: "FT20", quantity: 50 });
  });
});
