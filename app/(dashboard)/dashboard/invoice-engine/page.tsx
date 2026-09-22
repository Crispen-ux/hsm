import type { Metadata } from "next";
import { listInvoices } from "@/app/actions/invoices";
import { InvoiceEngine } from "@/components/dashboard/InvoiceEngine";

export const metadata: Metadata = {
  title: "New invoice",
  robots: { index: false, follow: false },
};

export default async function InvoiceEnginePage() {
  const result = await listInvoices({ limit: 10 });
  return <InvoiceEngine invoices={result.ok ? result.data.items : []} loadError={result.ok ? null : result.error.message} />;
}
