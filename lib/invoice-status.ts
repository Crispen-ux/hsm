import type { InvoiceStatus, Role } from "@/lib/domain";

const TRANSITIONS: Readonly<Record<InvoiceStatus, readonly InvoiceStatus[]>> = {
  DRAFT: ["ISSUED", "VOID"],
  ISSUED: ["PAID", "VOID"],
  PAID: ["VOID"],
  VOID: [],
};

export type TransitionCheck = "ALLOWED" | "INVALID" | "FORBIDDEN";

export function checkTransition(from: InvoiceStatus, to: InvoiceStatus, role: Role): TransitionCheck {
  if (!TRANSITIONS[from].includes(to)) {
    return "INVALID";
  }
  if (from === "PAID" && to === "VOID" && role !== "ADMIN") {
    return "FORBIDDEN";
  }
  return "ALLOWED";
}
