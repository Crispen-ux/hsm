import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { hawkPrisma?: PrismaClient };

export const db: PrismaClient = globalForPrisma.hawkPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.hawkPrisma = db;
}
