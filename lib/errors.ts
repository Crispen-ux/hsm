import { logError } from "@/lib/logger";
import { MoneyRangeError } from "@/lib/money";
import { fail, type ActionResult } from "@/lib/result";

const UNAVAILABLE_CODES: ReadonlySet<string> = new Set(["P1001", "P1002", "P1008", "P1017", "P2024", "P2028"]);
const UNAVAILABLE_NAMES: ReadonlySet<string> = new Set([
  "PrismaClientInitializationError",
  "PrismaClientRustPanicError",
]);

function prismaCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  const { code } = error;
  return typeof code === "string" && /^P\d{4}$/.test(code) ? code : null;
}

export function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }
  const { digest } = error;
  return typeof digest === "string" && (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE");
}

export function isUniqueViolation(error: unknown): boolean {
  return prismaCode(error) === "P2002";
}

export function mapUnknownError(scope: string, error: unknown): ActionResult<never> {
  if (isNextControlFlowError(error)) {
    throw error;
  }

  if (error instanceof MoneyRangeError) {
    return fail("VALIDATION", "The invoice amounts are outside the supported range.");
  }

  const code = prismaCode(error);
  if (code === "P2002") {
    return fail("CONFLICT", "That record already exists.");
  }
  if (code === "P2025") {
    return fail("NOT_FOUND", "That record could not be found.");
  }
  if (code === "P2003") {
    return fail("CONFLICT", "A related record is missing. Please sign in again.");
  }
  if ((code !== null && UNAVAILABLE_CODES.has(code)) || (error instanceof Error && UNAVAILABLE_NAMES.has(error.name))) {
    logError(scope, error);
    return fail("UNAVAILABLE", "The service is temporarily unavailable. Please try again shortly.");
  }

  logError(scope, error);
  return fail("INTERNAL", "Something went wrong. Please try again.");
}
