import { describe, expect, it } from "vitest";
import { describeHours, isOpenNow, type WeeklyHours } from "@/lib/business-hours";

const weekdays: WeeklyHours = [
  null,
  { open: "07:30", close: "17:00" },
  { open: "07:30", close: "17:00" },
  { open: "07:30", close: "17:00" },
  { open: "07:30", close: "17:00" },
  { open: "07:30", close: "17:00" },
  { open: "08:00", close: "13:00" },
];

describe("isOpenNow", () => {
  it("uses South African time, not the server clock", () => {
    expect(isOpenNow(weekdays, new Date("2026-03-02T05:29:00.000Z"))).toBe(false);
    expect(isOpenNow(weekdays, new Date("2026-03-02T05:30:00.000Z"))).toBe(true);
  });

  it("treats the closing minute as closed", () => {
    expect(isOpenNow(weekdays, new Date("2026-03-02T14:59:00.000Z"))).toBe(true);
    expect(isOpenNow(weekdays, new Date("2026-03-02T15:00:00.000Z"))).toBe(false);
  });

  it("handles Saturday hours and a closed Sunday", () => {
    expect(isOpenNow(weekdays, new Date("2026-03-07T08:00:00.000Z"))).toBe(true);
    expect(isOpenNow(weekdays, new Date("2026-03-07T11:30:00.000Z"))).toBe(false);
    expect(isOpenNow(weekdays, new Date("2026-03-08T08:00:00.000Z"))).toBe(false);
  });

  it("rolls the weekday over at local midnight", () => {
    expect(isOpenNow(weekdays, new Date("2026-03-01T22:30:00.000Z"))).toBe(false);
    expect(isOpenNow(weekdays, new Date("2026-03-01T22:00:00.000Z"))).toBe(false);
  });

  it("is closed when hours are malformed", () => {
    const broken: WeeklyHours = [null, { open: "25:00", close: "17:00" }, null, null, null, null, null];
    expect(isOpenNow(broken, new Date("2026-03-02T08:00:00.000Z"))).toBe(false);
  });
});

describe("describeHours", () => {
  it("groups identical days into ranges", () => {
    expect(describeHours(weekdays)).toBe("Sun closed, Mon to Fri 07:30 to 17:00, Sat 08:00 to 13:00");
  });
});
