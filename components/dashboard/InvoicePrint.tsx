"use client";

import { formatZar } from "@/lib/money";

interface InvoicePrintData {
  invoiceNumber: string;
  status: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  jobType: string;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  depositCents: number;
  createdAt: string;
}

interface InvoicePrintProps {
  invoice: InvoicePrintData;
}

export function InvoicePrint({ invoice }: InvoicePrintProps) {
  const print = () => window.print();

  return (
    <>
      <button type="button" onClick={print} className="btn btn-secondary chamfer print:hidden">
        Download PDF
      </button>

      <div className="print-document hidden">
        <div className="print-header">
          <div>
            <h1 className="print-company">Hawk Mobile Rubberising</h1>
            <p className="print-tagline">Polyurea & Rubber Coatings</p>
          </div>
          <div className="print-right">
            <h2 className="print-title">INVOICE</h2>
            <p className="print-meta">{invoice.invoiceNumber}</p>
            <p className="print-meta">{new Date(invoice.createdAt).toLocaleDateString("en-ZA")}</p>
            <p className="print-meta">Status: {invoice.status}</p>
          </div>
        </div>

        <div className="print-section">
          <h3 className="print-section-title">Bill To</h3>
          <p>{invoice.clientName}</p>
          <p>{invoice.clientPhone}</p>
          {invoice.clientEmail && <p>{invoice.clientEmail}</p>}
        </div>

        <div className="print-section">
          <h3 className="print-section-title">Job Details</h3>
          <p>Type: {invoice.jobType}</p>
        </div>

        <div className="print-totals" style={{ marginLeft: 0, width: "100%" }}>
          <div className="flex justify-between"><span>Subtotal</span><span>{formatZar(invoice.subtotalCents)}</span></div>
          <div className="flex justify-between"><span>VAT 15%</span><span>{formatZar(invoice.vatCents)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t border-black pt-1">
            <span>TOTAL</span><span>{formatZar(invoice.totalCents)}</span>
          </div>
          {invoice.depositCents > 0 && (
            <>
              <div className="flex justify-between"><span>Deposit paid</span><span>{formatZar(invoice.depositCents)}</span></div>
              <div className="flex justify-between font-semibold"><span>Balance due</span><span>{formatZar(invoice.totalCents - invoice.depositCents)}</span></div>
            </>
          )}
        </div>

        <div className="print-footer">
          <p>Hawk Mobile Rubberising - Polyurea & Rubber Coatings</p>
          <p className="print-contact">www.hawkmobile.co.za</p>
        </div>
      </div>
    </>
  );
}
