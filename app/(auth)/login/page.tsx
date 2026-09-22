import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeDashboardRedirect } from "@/lib/redirects";

export const metadata: Metadata = {
  title: "Crew sign in",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.callbackUrl) ? params.callbackUrl[0] : params.callbackUrl;

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">Field crew</p>
      <h1 className="text-chrome mt-3 font-display text-4xl font-black uppercase leading-none tracking-[-0.02em]">
        Sign in
      </h1>
      <div className="mt-10 border border-hawk-obsidian-border bg-hawk-obsidian-card p-6">
        <LoginForm callbackUrl={safeDashboardRedirect(raw)} />
      </div>
    </main>
  );
}
