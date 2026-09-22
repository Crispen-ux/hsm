"use client";

import Link from "next/link";
import { useRef, type MouseEvent } from "react";
import { NAV_ITEMS } from "@/lib/navigation";

export function MobileMenu() {
  const dialog = useRef<HTMLDialogElement>(null);

  const close = () => dialog.current?.close();

  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      close();
    }
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center px-3 text-zinc-200"
      >
        <span className="sr-only">Open menu</span>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 7h18M3 12h18M3 17h12" />
        </svg>
      </button>

      <dialog
        ref={dialog}
        onClick={onBackdropClick}
        aria-label="Menu"
        className="m-0 h-full max-h-none w-full max-w-none bg-hawk-obsidian-bg p-0 text-zinc-200 backdrop:bg-black/80"
      >
        <div className="flex h-full flex-col px-5 pb-8 pt-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center px-3 text-zinc-200"
            >
              <span className="sr-only">Close menu</span>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>
          <nav aria-label="Menu" className="mt-8 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="display-wide text-chrome py-3 text-[clamp(2rem,10vw,3rem)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link href="/#quote" onClick={close} className="btn btn-primary chamfer mt-auto">
            Get a quote
          </Link>
        </div>
      </dialog>
    </div>
  );
}
