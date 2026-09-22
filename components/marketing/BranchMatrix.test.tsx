import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BranchMatrix } from "@/components/marketing/BranchMatrix";
import type { Branch } from "@/lib/site-config";

const weekdayHours = [
  null,
  { open: "07:30", close: "17:00" },
  { open: "07:30", close: "17:00" },
  { open: "07:30", close: "17:00" },
  { open: "07:30", close: "17:00" },
  { open: "07:30", close: "17:00" },
  null,
] as const;

const branch: Branch = {
  name: "Germiston",
  region: "Gauteng",
  phoneDisplay: "011 000 0000",
  phoneE164: "+27110000000",
  whatsappE164: "+27820000000",
  hours: weekdayHours,
  serviceRadiusKm: 150,
};

const OPEN_MONDAY = new Date("2026-03-02T08:00:00.000Z");
const CLOSED_SUNDAY = new Date("2026-03-01T08:00:00.000Z");

describe("BranchMatrix", () => {
  it("shows Open now inside opening hours in South African time", () => {
    const html = renderToStaticMarkup(<BranchMatrix branches={[branch]} now={OPEN_MONDAY} />);
    expect(html).toContain("Open now");
    expect(html).toContain("Germiston");
  });

  it("shows Closed outside opening hours", () => {
    const html = renderToStaticMarkup(<BranchMatrix branches={[branch]} now={CLOSED_SUNDAY} />);
    expect(html).toContain("Closed");
    expect(html).not.toContain("Open now");
  });

  it("renders tel and WhatsApp links only when the numbers exist", () => {
    const full = renderToStaticMarkup(<BranchMatrix branches={[branch]} now={OPEN_MONDAY} />);
    expect(full).toContain('href="tel:+27110000000"');
    expect(full).toContain("https://wa.me/27820000000");

    const bare = renderToStaticMarkup(
      <BranchMatrix branches={[{ ...branch, phoneE164: null, whatsappE164: null, serviceRadiusKm: null }]} now={OPEN_MONDAY} />,
    );
    expect(bare).not.toContain("tel:");
    expect(bare).not.toContain("wa.me");
    expect(bare).not.toContain("Travels up to");
  });

  it("describes the hours in plain words", () => {
    const html = renderToStaticMarkup(<BranchMatrix branches={[branch]} now={OPEN_MONDAY} />);
    expect(html).toContain("Mon to Fri 07:30 to 17:00");
  });
});
