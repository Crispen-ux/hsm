import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { isUniqueViolation } from "@/lib/errors";
import type { LeadInput } from "@/lib/validations";

export interface LeadContext {
  ipHash: string | null;
  now: Date;
}

export interface LeadReceipt {
  referenceCode: string;
}

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const REFERENCE_LENGTH = 6;
const REJECTION_LIMIT = 248;
const MAX_ATTEMPTS = 3;

export function generateReferenceCode(random: (size: number) => Uint8Array = randomBytes): string {
  let code = "";
  while (code.length < REFERENCE_LENGTH) {
    for (const byte of random(REFERENCE_LENGTH * 2)) {
      if (byte < REJECTION_LIMIT && code.length < REFERENCE_LENGTH) {
        code += REFERENCE_ALPHABET.charAt(byte % REFERENCE_ALPHABET.length);
      }
    }
  }
  return `HWK-${code}`;
}

export async function createLead(
  client: Pick<PrismaClient, "lead">,
  input: LeadInput,
  context: LeadContext,
): Promise<LeadReceipt> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const referenceCode = generateReferenceCode();
    try {
      await client.lead.create({
        data: {
          referenceCode,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email,
          serviceInterest: input.serviceInterest,
          vehicleMake: input.vehicleMake,
          vehicleModel: input.vehicleModel,
          containerSize: input.containerSize,
          containerScope: input.containerScope,
          containerQuantity: input.containerQuantity,
          serviceLocation: input.serviceLocation,
          siteLocation: input.siteLocation,
          siteAccessNotes: input.siteAccessNotes,
          hasPhotos: input.hasPhotos,
          message: input.message,
          consentGivenAt: context.now,
          ipHash: context.ipHash,
        },
        select: { id: true },
      });
      return { referenceCode };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}
