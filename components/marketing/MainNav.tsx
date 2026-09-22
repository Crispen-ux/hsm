"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "@/lib/navigation";

export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-[48px] items-center px-4 text-[0.95rem] font-medium",
              active ? "text-white" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            {item.label}
            {active ? <span className="absolute inset-x-4 bottom-1 h-px bg-hawk-crimson" aria-hidden /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
