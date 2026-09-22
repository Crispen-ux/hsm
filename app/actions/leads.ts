"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { mapUnknownError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";
import { formDataToObject } from "@/lib/form-data";
import { normalizeLeadPayload } from "@/lib/lead-payload";
import { extractClientIp, hashIdentifier } from "@/lib/ip";
import { checkRateLimit, LEAD_SUBMIT_RULE } from "@/lib/rate-limit";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/result";
import { createLead, generateReferenceCode, type LeadReceipt } from "@/lib/services/leads";
import { leadInputSchema } from "@/lib/validations";

const FORM_OPTIONS = {
  booleans: ["consent", "hasPhotos"],
  numbers: ["containerQuantity"],
} as const;

export async function submitLead(
  _previous: ActionResult<LeadReceipt> | null,
  formData: FormData,
): Promise<ActionResult<LeadReceipt>> {
  try {
    const honeypot = formData.get("website");
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
      return ok({ referenceCode: generateReferenceCode() });
    }

    const requestHeaders = await headers();
    const ipHash = hashIdentifier(extractClientIp(requestHeaders), getServerEnv().AUTH_SECRET);

    const limit = await checkRateLimit(db, LEAD_SUBMIT_RULE, ipHash);
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.retryAfterSeconds / 60);
      return fail("RATE_LIMITED", `Too many submissions. Please try again in about ${minutes} minute(s).`);
    }

    const parsed = leadInputSchema.safeParse(normalizeLeadPayload(formDataToObject(formData, FORM_OPTIONS)));
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    return ok(await createLead(db, parsed.data, { ipHash, now: new Date() }));
  } catch (error) {
    return mapUnknownError("leads.submit", error);
  }
}
