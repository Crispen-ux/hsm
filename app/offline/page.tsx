import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="display-wide text-chrome text-[clamp(1.75rem,8vw,2.5rem)]">No signal</h1>
      <p className="mt-6 text-zinc-300">
        This page is not saved on your phone yet. Invoices you have already saved stay on this device and send themselves when
        you are back online.
      </p>
      <a href="/dashboard/invoice-engine" className="btn btn-primary chamfer mt-10">
        Try again
      </a>
    </main>
  );
}
