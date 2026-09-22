"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapUnknownError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";
import { extractClientIp, hashIdentifier } from "@/lib/ip";
import { checkRateLimit, LOGIN_ACCOUNT_RULE, LOGIN_IP_RULE } from "@/lib/rate-limit";
import { safeDashboardRedirect } from "@/lib/redirects";
import { fail, fromZodError, ok, type ActionResult } from "@/lib/result";
import { loginSchema } from "@/lib/validations";

export async function loginAction(
  _previous: ActionResult<{ redirectTo: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ redirectTo: string }>> {
  const destination = safeDashboardRedirect(formData.get("callbackUrl"));

  try {
    const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) {
      return fromZodError(parsed.error);
    }

    const secret = getServerEnv().AUTH_SECRET;
    const requestHeaders = await headers();
    const ipHash = hashIdentifier(extractClientIp(requestHeaders), secret);
    const accountHash = hashIdentifier(parsed.data.email, secret);

    const ipLimit = await checkRateLimit(db, LOGIN_IP_RULE, ipHash);
    const accountLimit = await checkRateLimit(db, LOGIN_ACCOUNT_RULE, accountHash);
    if (!ipLimit.allowed || !accountLimit.allowed) {
      return fail("RATE_LIMITED", "Too many sign-in attempts. Please wait 15 minutes and try again.");
    }

    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("UNAUTHORIZED", "Incorrect email or password.");
    }
    return mapUnknownError("auth.login", error);
  }

  redirect(destination);
  return ok({ redirectTo: destination });
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
