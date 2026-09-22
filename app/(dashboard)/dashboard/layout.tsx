import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { ServiceWorkerRegister } from "@/components/dashboard/ServiceWorkerRegister";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Crew dashboard",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Hawk Field", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050506",
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div
      className="min-h-screen overscroll-none touch-manipulation"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)", overscrollBehavior: "none" }}
    >
      <ServiceWorkerRegister />
      <header className="flex items-center justify-between gap-3 border-b border-hawk-obsidian-border px-4 py-2">
        <Link href="/dashboard" className="inline-flex min-h-[44px] flex-col justify-center leading-tight">
          <span className="text-sm text-zinc-400">Hawk field</span>
          <span className="text-sm text-zinc-100">{user.name}</span>
        </Link>
        <LogoutButton />
      </header>
      <nav className="flex gap-3 border-b border-hawk-obsidian-border px-4 py-2">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200 min-h-[44px] flex items-center">
          Invoices
        </Link>
        <Link href="/dashboard/quotes" className="text-sm text-zinc-400 hover:text-zinc-200 min-h-[44px] flex items-center">
          Quotes
        </Link>
      </nav>
      <main id="main" className="px-4 py-6">
        {children}
      </main>
    </div>
  );
}
