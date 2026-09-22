import { describe, expect, it } from "vitest";
import { localBusinessJsonLd, serializeJsonLd, serviceJsonLd } from "@/lib/structured-data";

describe("structured data", () => {
  it("omits contact details that have not been supplied", () => {
    const data = localBusinessJsonLd();
    expect(data["@type"]).toBe("LocalBusiness");
    expect(data).not.toHaveProperty("telephone");
    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("priceRange");
  });

  it("describes one service per asset class", () => {
    const services = serviceJsonLd();
    expect(services).toHaveLength(3);
    expect(services.every((service) => service["@type"] === "Service")).toBe(true);
  });

  it("escapes angle brackets so markup cannot break out of the script tag", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(serialized).not.toContain("</script>");
    expect(JSON.parse(serialized).name).toBe("</script><script>alert(1)</script>");
  });
});
