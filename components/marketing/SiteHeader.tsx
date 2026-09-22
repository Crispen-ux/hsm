import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { MainNav } from "@/components/marketing/MainNav";
import { MobileMenu } from "@/components/marketing/MobileMenu";
import { ButtonLink } from "@/components/ui/Button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hawk-obsidian-border bg-hawk-obsidian-bg/95">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Hawk Mobile Rubberising, home" className="inline-flex min-h-[48px] items-center">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-2">
          <MainNav />
          <ButtonLink href="/#quote" className="hidden md:inline-flex">
            Get a quote
          </ButtonLink>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
