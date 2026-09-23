"use client";

import { formatZar } from "@/lib/money";

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

interface InvoicePrintData {
  invoiceNumber: string;
  status: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  jobType: string;
  lines: InvoiceLine[];
  subtotalCents: number;
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
          <div className="print-brand">
            <h1 className="print-company">HAWK</h1>
            <p className="print-tagline">Mobile Rubberising</p>
            <p className="print-tagline-sm">Polyurea & Rubber Coatings</p>
          </div>
          <div className="print-right">
            <h2 className="print-title">INVOICE</h2>
            <p className="print-meta">Invoice Date: {new Date(invoice.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="print-meta">Invoice Number: {invoice.invoiceNumber}</p>
          </div>
        </div>

        <div className="print-section">
          <h3 className="print-section-title">Bill To:</h3>
          <p className="print-client-name">{invoice.clientName}</p>
        </div>

        {invoice.lines.length > 0 && (
          <table className="print-table">
            <thead>
              <tr>
                <th>Description</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Unit Price (ZAR)</th>
                <th className="text-right">Total (ZAR)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, i) => (
                <tr key={i}>
                  <td>{line.description}</td>
                  <td className="text-center">{line.quantity}</td>
                  <td className="text-right">{formatZar(line.unitPriceCents).replace("R", "")}</td>
                  <td className="text-right font-semibold">{formatZar(line.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="print-totals-section">
          <div className="print-totals-row print-total-due">
            <span>TOTAL DUE:</span>
            <span>{formatZar(invoice.totalCents)}</span>
          </div>
          {invoice.depositCents > 0 && (
            <>
              <div className="print-totals-row">
                <span>Deposit Paid:</span>
                <span>{formatZar(invoice.depositCents)}</span>
              </div>
              <div className="print-totals-row print-balance">
                <span>Balance Due:</span>
                <span>{formatZar(invoice.totalCents - invoice.depositCents)}</span>
              </div>
            </>
          )}
        </div>

        <div className="print-section">
          <h3 className="print-section-title">Payment Information</h3>
          <p>Bank: Capitec Business</p>
          <p>Account Name: Amanzi Ahobile Trading</p>
          <p>Account Number: 1051603293</p>
        </div>

        <div className="print-section">
          <h3 className="print-section-title">Terms &amp; Conditions</h3>
          <ul className="print-terms">
            <li>Payment due upon receipt of invoice.</li>
            <li>Delivery will be scheduled once payment is confirmed.</li>
            <li>Please use invoice number as payment reference.</li>
          </ul>
        </div>

        <div className="print-footer-thanks">
          <p><em>Thank you for your business</em></p>
        </div>
      </div>
    </>
  );
}
