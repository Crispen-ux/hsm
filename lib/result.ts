import type { ZodError } from "zod";

export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type FieldErrors = Record<string, string[]>;

export interface ActionError {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(code: ErrorCode, message: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error: fieldErrors ? { code, message, fieldErrors } : { code, message } };
}

export function fromZodError(error: ZodError): ActionResult<never> {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    const existing = fieldErrors[key];
    if (existing) {
      existing.push(issue.message);
    } else {
      fieldErrors[key] = [issue.message];
    }
  }
  return fail("VALIDATION", "Please check the highlighted fields and try again.", fieldErrors);
}
