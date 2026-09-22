import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations";

const DUMMY_PASSWORD_HASH = "$2b$12$a0RYkxe4c2O1DaPT4qa7S.PUXtwKeDSVWjnmBpUcYPfF8YvKDqhZ6";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) {
          return null;
        }

        const user = await db.crewUser.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, name: true, role: true, passwordHash: true },
        });

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );

        if (!user || !passwordMatches) {
          return null;
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
