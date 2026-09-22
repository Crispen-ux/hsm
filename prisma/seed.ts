import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const MIN_PASSWORD_LENGTH = 12;
const BCRYPT_COST = 12;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required to seed the first crew user`);
  }
  return value;
}

async function main(): Promise<void> {
  const email = requiredEnv("SEED_EMAIL").trim().toLowerCase();
  const name = requiredEnv("SEED_NAME").trim();
  const password = requiredEnv("SEED_PASSWORD");

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SEED_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const client = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    await client.crewUser.upsert({
      where: { email },
      create: { email, name, passwordHash, role: "ADMIN" },
      update: { name, passwordHash },
    });
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Seed failed"}\n`);
  process.exit(1);
});
