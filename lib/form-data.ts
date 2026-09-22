export interface FormDataOptions {
  booleans: readonly string[];
  numbers: readonly string[];
}

const TRUTHY: ReadonlySet<string> = new Set(["on", "true", "1"]);

export function formDataToObject(formData: FormData, options: FormDataOptions): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed === "") {
      continue;
    }
    if (options.booleans.includes(key)) {
      if (TRUTHY.has(trimmed.toLowerCase())) {
        result[key] = true;
      }
      continue;
    }
    if (options.numbers.includes(key)) {
      result[key] = /^\d{1,9}$/.test(trimmed) ? Number(trimmed) : trimmed;
      continue;
    }
    result[key] = value;
  }

  return result;
}
