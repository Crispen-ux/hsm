import { describe, expect, it } from "vitest";
import { formDataToObject } from "@/lib/form-data";

const options = { booleans: ["consent", "hasPhotos"], numbers: ["containerQuantity"] } as const;

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

describe("formDataToObject", () => {
  it("drops blank fields so optional and forbidden keys stay absent", () => {
    const result = formDataToObject(form({ fullName: "Sipho", email: "  ", containerSize: "" }), options);
    expect(result).toEqual({ fullName: "Sipho" });
  });

  it("converts checkboxes and omits unchecked ones", () => {
    expect(formDataToObject(form({ consent: "on" }), options)).toEqual({ consent: true });
    expect(formDataToObject(form({ consent: "false" }), options)).toEqual({});
  });

  it("converts numeric fields but leaves invalid numbers for validation to reject", () => {
    expect(formDataToObject(form({ containerQuantity: "3" }), options)).toEqual({ containerQuantity: 3 });
    expect(formDataToObject(form({ containerQuantity: "3.5" }), options)).toEqual({ containerQuantity: "3.5" });
    expect(formDataToObject(form({ containerQuantity: "-1" }), options)).toEqual({ containerQuantity: "-1" });
  });

  it("ignores Next.js internal action fields and files", () => {
    const data = form({ fullName: "Sipho", $ACTION_ID_abc: "x" });
    data.append("upload", new File(["x"], "x.txt"));
    expect(formDataToObject(data, options)).toEqual({ fullName: "Sipho" });
  });
});
