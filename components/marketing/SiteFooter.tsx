import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { NAV_ITEMS } from "@/lib/navigation";
import { SITE_CONFIG, whatsappHref } from "@/lib/site-config";

export function SiteFooter() {
  const { contact } = SITE_CONFIG;
  const whatsapp = whatsappHref(contact.whatsappE164);
  return (
    <footer className="mt-32 border-t border-hawk-obsidian-border">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark />
          <p className="mt-5 max-w-sm text-zinc-400">
            Spray-on polyurethane protection for vehicles, shipping containers and industrial surfaces.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-3 md:col-start-7">
          <ul className="space-y-1">
            {[{ href: "/", label: "Home" }, ...NAV_ITEMS].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-[44px] items-center text-zinc-300 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-3">
          <ul className="space-y-1">
            {contact.phoneE164 && contact.phoneDisplay ? (
              <li>
                <a href={`tel:${contact.phoneE164}`} className="inline-flex min-h-[44px] items-center font-mono text-zinc-200">
                  {contact.phoneDisplay}
                </a>
              </li>
            ) : null}
            {whatsapp ? (
              <li>
                <a href={whatsapp} className="inline-flex min-h-[44px] items-center text-zinc-300 hover:text-white" rel="noopener noreferrer" target="_blank">
                  WhatsApp
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li>
                <a href={`mailto:${contact.email}`} className="inline-flex min-h-[44px] items-center text-zinc-300 hover:text-white">
                  {contact.email}
                </a>
              </li>
            ) : null}
            <li>
              <Link href="/login" className="inline-flex min-h-[44px] items-center text-zinc-400 hover:text-white">
                Crew sign in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-hawk-obsidian-border">
        <p className="mx-auto w-full max-w-[1200px] px-5 py-5 text-sm text-zinc-400 sm:px-8">
          Hawk Mobile Rubberising. South Africa.
        </p>
      </div>
    </footer>
  );
}
