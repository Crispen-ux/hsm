"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import type { ActionResult } from "@/lib/result";

type LoginState = ActionResult<{ redirectTo: string }> | null;

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const error = state && !state.ok ? state.error : null;
  const fieldErrors = error?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <label htmlFor="email" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          aria-invalid={fieldErrors.email ? true : undefined}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
          className="mt-2 min-h-tap w-full border-0 border-b border-hawk-obsidian-border bg-transparent px-0 text-base text-zinc-100 focus:border-hawk-crimson focus:outline-none focus:ring-0"
        />
        {fieldErrors.email ? (
          <p id="email-error" className="mt-2 text-sm text-hawk-gold">
            {fieldErrors.email.join(" ")}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
          className="mt-2 min-h-tap w-full border-0 border-b border-hawk-obsidian-border bg-transparent px-0 text-base text-zinc-100 focus:border-hawk-crimson focus:outline-none focus:ring-0"
        />
        {fieldErrors.password ? (
          <p id="password-error" className="mt-2 text-sm text-hawk-gold">
            {fieldErrors.password.join(" ")}
          </p>
        ) : null}
      </div>

      {error && !error.fieldErrors ? (
        <p role="alert" className="border-l-2 border-hawk-gold pl-3 text-sm text-hawk-gold">
          {error.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-tap w-full bg-hawk-crimson px-6 font-mono text-xs uppercase tracking-[0.14em] text-white transition-transform active:translate-y-[2px] disabled:opacity-60"
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
