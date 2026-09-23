"use client";

import { useCallback, useMemo, useState } from "react";
import { Field } from "@/components/ui/Field";
import { ProductSelect } from "@/components/dashboard/ProductSelect";
import {
  CONTAINER_SCOPES,
  CONTAINER_SCOPE_LABELS,
  CONTAINER_SIZE_LABELS,
  SERVICE_LOCATION_LABELS,
  type ContainerScope,
  type ContainerSize,
  type JobType,
  type LineUnit,
  type ServiceLocation,
} from "@/lib/domain";
import { cn } from "@/lib/cn";
import { formatZar } from "@/lib/money";
import { VEHICLE_TIERS, CONTAINER_SCOPE_RATES, MOBILISATION_FEE_CENTS } from "@/lib/pricing-tiers";
import { suggestedAreaHundredths } from "@/lib/container-specs";
import { hundredthsToMilli } from "@/lib/container-specs";
import { formatMilli } from "@/lib/quantity";
import { whatsappHref, SITE_CONFIG } from "@/lib/site-config";
import { formatQuoteWhatsAppMessage, buildQuoteShareMessage } from "@/lib/quote-whatsapp";
import type { QuotePrefill } from "@/lib/quote-link";
import { computeInvoiceTotals } from "@/lib/money";
import type { CatalogueProduct, ProductCategory } from "@/lib/product-catalogue";

interface QuoteLine {
  id: string;
  description: string;
  unit: LineUnit;
  quantity: string;
  unitPrice: string;
}

interface QuoteData {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  jobType: JobType;
  vehicleDetails: string;
  containerSize: Exclude<ContainerSize, "OTHER">;
  containerScope: ContainerScope;
  containerQuantity: number;
  serviceLocation: ServiceLocation;
  siteAddress: string;
  notes: string;
  lines: QuoteLine[];
  removedAutoLines: string[];
}

const SIZES: readonly Exclude<ContainerSize, "OTHER">[] = ["FT20", "FT40", "FT40_HC"];
const LOCATIONS: readonly ServiceLocation[] = ["ON_SITE", "IN_YARD"];

function newLineId(): string {
  return `ql-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitial(): QuoteData {
  return {
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    jobType: "VEHICLE",
    vehicleDetails: "",
    containerSize: "FT40",
    containerScope: "FLOOR_ONLY",
    containerQuantity: 1,
    serviceLocation: "ON_SITE",
    siteAddress: "",
    notes: "",
    lines: [{ id: newLineId(), description: "", unit: "EACH", quantity: "1", unitPrice: "" }],
    removedAutoLines: [],
  };
}

function parseRands(input: string): number | null {
  const cleaned = input.trim().replace(/^r\s*/i, "").replace(/,/g, "");
  if (cleaned === "") return null;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.round(num * 100) : null;
}

function parseQuantity(input: string, unit: LineUnit): number | null {
  const cleaned = input.trim().replace(/m²/gi, "").replace(/m2/gi, "");
  if (cleaned === "") return null;
  const num = parseFloat(cleaned);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (unit === "SQM") return Math.round(num * 1000);
  return Math.round(num * 1000);
}

function autoLines(data: QuoteData): QuoteLine[] {
  if (data.jobType === "VEHICLE") {
    const tier = VEHICLE_TIERS.find((t) => t.key === "VEHICLE_FULL");
    if (!tier || tier.priceCents === null) return [];
    const suffix = data.vehicleDetails.trim() ? ` - ${data.vehicleDetails.trim()}` : "";
    return [{ id: "auto-tier", description: `${tier.label} coating${suffix}`, unit: "EACH", quantity: "1", unitPrice: String(tier.priceCents / 100) }];
  }
  if (data.jobType === "CONTAINER") {
    const rate = CONTAINER_SCOPE_RATES[data.containerScope];
    const areaHundredths = suggestedAreaHundredths(data.containerSize, data.containerScope);
    const areaMilli = areaHundredths === null ? null : hundredthsToMilli(areaHundredths) * data.containerQuantity;
    const lines: QuoteLine[] = [
      {
        id: "auto-area",
        description: `${CONTAINER_SCOPE_LABELS[data.containerScope]} - ${CONTAINER_SIZE_LABELS[data.containerSize]} x ${data.containerQuantity}`,
        unit: "SQM",
        quantity: areaMilli === null ? "" : formatMilli(areaMilli, "SQM"),
        unitPrice: rate.ratePerSqmCents === null ? "" : String(rate.ratePerSqmCents / 100),
      },
    ];
    if (data.serviceLocation === "ON_SITE" && MOBILISATION_FEE_CENTS !== null) {
      lines.push({ id: "auto-mob", description: "On-site mobilisation", unit: "EACH", quantity: "1", unitPrice: String(MOBILISATION_FEE_CENTS / 100) });
    }
    return lines;
  }
  return [];
}

function computeTotals(lines: QuoteLine[]) {
  let subtotal = 0;
  for (const line of lines) {
    const qty = parseQuantity(line.quantity, line.unit);
    const price = parseRands(line.unitPrice);
    if (qty !== null && price !== null) {
      subtotal += Math.round((price * qty) / 1000);
    }
  }
  return { subtotal, total: subtotal };
}

function TextField(props: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string; inputMode?: "text" | "tel" | "email" }) {
  const { id, label, value, onChange, hint, placeholder, inputMode } = props;
  return (
    <Field id={id} label={label} hint={hint}>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </Field>
  );
}

export interface QuoteEngineProps {
  onSaved?: (quoteId: string) => void;
}

export function QuoteEngine({ onSaved }: QuoteEngineProps) {
  const [data, setData] = useState<QuoteData>(createInitial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ id: string; number: string } | null>(null);

  const update = useCallback(<K extends keyof QuoteData>(key: K, value: QuoteData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<QuoteLine>) => {
    setData((prev) => ({ ...prev, lines: prev.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }, []);

  const addLine = useCallback(() => {
    setData((prev) => ({ ...prev, lines: [...prev.lines, { id: newLineId(), description: "", unit: "EACH", quantity: "1", unitPrice: "" }] }));
  }, []);

  const removeLine = useCallback((id: string) => {
    setData((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }));
  }, []);

  const removeAutoLine = useCallback((id: string) => {
    setData((prev) => ({ ...prev, removedAutoLines: [...prev.removedAutoLines, id] }));
  }, []);

  const selectProduct = useCallback((lineId: string, product: CatalogueProduct) => {
    setData((prev) => ({
      ...prev,
      lines: prev.lines.map((l) =>
        l.id === lineId
          ? {
              ...l,
              description: product.name,
              unit: product.unit,
              unitPrice: product.unitPriceCents > 0 ? String(product.unitPriceCents / 100) : l.unitPrice,
            }
          : l,
      ),
    }));
  }, []);

  const allLines = useMemo(() => {
    const auto = autoLines(data).filter((l) => !data.removedAutoLines.includes(l.id));
    const manual = data.lines.filter((l) => !l.id.startsWith("auto-"));
    return [...auto, ...manual];
  }, [data]);

  const totals = useMemo(() => computeTotals(allLines), [allLines]);

  const quoteNumber = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `QTE-${y}${m}${d}-${String(Math.floor(Math.random() * 900) + 100)}`;
  }, []);

  const printQuote = useCallback(() => {
    window.print();
  }, []);

  const shareWhatsApp = useCallback(() => {
    const msg = `*Hawk Mobile Rubberising*\nQuote ${quoteNumber}\n\nClient: ${data.clientName || "N/A"}\n${data.jobType === "VEHICLE" ? `Vehicle: ${data.vehicleDetails || "N/A"}` : data.jobType === "CONTAINER" ? `Container: ${CONTAINER_SIZE_LABELS[data.containerSize]} - ${CONTAINER_SCOPE_LABELS[data.containerScope]} x ${data.containerQuantity}` : "Industrial coating"}\n\n${allLines.map((l) => `- ${l.description}: ${l.unit === "SQM" ? `R${l.unitPrice}/m² × ${l.quantity}m²` : `R${l.unitPrice} × ${l.quantity}`}`).join("\n")}\n\n*Total: ${formatZar(totals.total)}*\n\nValid for 30 days. Final price confirmed after inspection.\nHawk Mobile Rubberising - Polyurea & Rubber Coatings`;
    const url = whatsappHref(SITE_CONFIG.contact.whatsappE164, msg);
    if (url) window.open(url, "_blank");
  }, [data, allLines, totals, quoteNumber]);

  return (
    <div className="mx-auto max-w-2xl pb-36">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="display-wide text-chrome text-[clamp(1.6rem,7vw,2.25rem)]">New quote</h1>
        <p className="font-mono text-sm text-zinc-400">{quoteNumber}</p>
      </div>

      {saved ? (
        <p role="status" className="mt-4 border-l-2 border-emerald-400 pl-3 text-sm text-zinc-100">
          Quote {saved.number} saved.
        </p>
      ) : null}

      <section className="mt-8 space-y-10">
        <div className="space-y-5">
          <h2 className="display-narrow text-chrome text-2xl">Client</h2>
          <TextField id="q-clientName" label="Name" value={data.clientName} onChange={(v) => update("clientName", v)} placeholder="Client name" />
          <TextField id="q-clientPhone" label="Phone" value={data.clientPhone} onChange={(v) => update("clientPhone", v)} inputMode="tel" placeholder="082 123 4567" />
          <TextField id="q-clientEmail" label="Email" hint="optional" value={data.clientEmail} onChange={(v) => update("clientEmail", v)} inputMode="email" placeholder="client@example.com" />
        </div>

        <div className="space-y-5">
          <h2 className="display-narrow text-chrome text-2xl">The job</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["VEHICLE", "CONTAINER", "INDUSTRIAL"] as const).map((jt) => (
              <button key={jt} type="button" onClick={() => update("jobType", jt)} className={cn("chamfer min-h-[48px] border px-3 text-sm", data.jobType === jt ? "border-hawk-crimson bg-hawk-crimson/15 text-white" : "border-zinc-700 text-zinc-300")}>
                {jt === "VEHICLE" ? "Vehicle" : jt === "CONTAINER" ? "Container" : "Industrial"}
              </button>
            ))}
          </div>

          {data.jobType === "VEHICLE" && (
            <TextField id="q-vehicleDetails" label="Vehicle" value={data.vehicleDetails} onChange={(v) => update("vehicleDetails", v)} placeholder="Toyota Hilux double cab" />
          )}

          {data.jobType === "CONTAINER" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map((s) => (
                  <button key={s} type="button" onClick={() => update("containerSize", s)} className={cn("chamfer min-h-[48px] border px-3 text-sm", data.containerSize === s ? "border-hawk-crimson bg-hawk-crimson/15 text-white" : "border-zinc-700 text-zinc-300")}>
                    {CONTAINER_SIZE_LABELS[s]}
                  </button>
                ))}
              </div>
              <Field id="q-scope" label="Surfaces">
                <select id="q-scope" value={data.containerScope} onChange={(e) => update("containerScope", e.target.value as ContainerScope)} className="field-input">
                  {CONTAINER_SCOPES.map((s) => <option key={s} value={s}>{CONTAINER_SCOPE_LABELS[s]}</option>)}
                </select>
              </Field>
              <div className="flex items-center gap-3">
                <button type="button" disabled={data.containerQuantity <= 1} onClick={() => update("containerQuantity", Math.max(1, data.containerQuantity - 1))} className="chamfer min-h-[48px] min-w-[48px] border border-zinc-700 text-lg disabled:opacity-40">&minus;</button>
                <output className="min-w-[3.5rem] text-center font-mono text-xl tabular-nums text-zinc-50">{data.containerQuantity}</output>
                <button type="button" disabled={data.containerQuantity >= 50} onClick={() => update("containerQuantity", Math.min(50, data.containerQuantity + 1))} className="chamfer min-h-[48px] min-w-[48px] border border-zinc-700 text-lg disabled:opacity-40">+</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {LOCATIONS.map((loc) => (
                  <button key={loc} type="button" onClick={() => update("serviceLocation", loc)} className={cn("chamfer min-h-[48px] border px-3 text-sm", data.serviceLocation === loc ? "border-hawk-crimson bg-hawk-crimson/15 text-white" : "border-zinc-700 text-zinc-300")}>
                    {SERVICE_LOCATION_LABELS[loc]}
                  </button>
                ))}
              </div>
              <TextField id="q-siteAddress" label="Site address" value={data.siteAddress} onChange={(v) => update("siteAddress", v)} />
            </div>
          )}

          {data.jobType === "INDUSTRIAL" && (
            <TextField id="q-siteAddress" label="Site address" value={data.siteAddress} onChange={(v) => update("siteAddress", v)} />
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="display-narrow text-chrome text-2xl">Line items</h2>
            <button type="button" onClick={addLine} className="min-h-[44px] border border-zinc-700 px-3 text-sm text-zinc-100">+ Add line</button>
          </div>
          {allLines.map((line) => {
            const isAuto = line.id.startsWith("auto-");
            return (
              <div key={line.id} className={cn("space-y-2 border p-3", isAuto ? "border-hawk-crimson/30 bg-hawk-crimson/5" : "border-zinc-700")}>
                {!isAuto && (
                  <ProductSelect
                    id={`q-product-${line.id}`}
                    label="Pick from catalogue"
                    hint="optional"
                    onSelect={(product) => selectProduct(line.id, product)}
                  />
                )}
                <div className="grid gap-3" style={{ gridTemplateColumns: "1fr auto auto auto auto" }}>
                  <input type="text" value={line.description} onChange={(e) => updateLine(line.id, { description: e.target.value })} disabled={isAuto} placeholder="Description" className="field-input col-span-1" />
                  <input type="text" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: e.target.value })} disabled={isAuto} placeholder={line.unit === "SQM" ? "m²" : "Qty"} className="field-input w-20" />
                  <input type="text" value={line.unitPrice} onChange={(e) => updateLine(line.id, { unitPrice: e.target.value })} disabled={isAuto} placeholder="R each" className="field-input w-24" />
                  <button type="button" onClick={() => isAuto ? removeAutoLine(line.id) : removeLine(line.id)} className="min-h-[44px] px-2 text-sm text-zinc-400">×</button>
                </div>
                {isAuto && <p className="text-xs text-zinc-500">Suggested from job type. Click × to remove.</p>}
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <Field id="q-notes" label="Notes" hint="optional">
            <textarea id="q-notes" value={data.notes} onChange={(e) => update("notes", e.target.value)} rows={3} className="field-input resize-y" placeholder="Valid for 30 days. Terms and conditions..." />
          </Field>
        </div>

        <div className="border-t border-hawk-obsidian-border pt-6">
          <dl className="space-y-2">
            <div className="flex justify-between border-t-2 border-zinc-600 pt-2"><dt className="font-semibold text-zinc-100">Total</dt><dd className="font-mono text-2xl tabular-nums text-white">{formatZar(totals.total)}</dd></div>
          </dl>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={printQuote} className="btn btn-primary chamfer flex-1">Download PDF</button>
          <button type="button" onClick={shareWhatsApp} className="btn btn-secondary chamfer flex-1">Share on WhatsApp</button>
        </div>
      </section>

      {/* Print-only quote document */}
      <div className="print-document hidden">
        <div className="print-header">
          <div className="print-brand">
            <h1 className="print-company">HAWK</h1>
            <p className="print-tagline">Mobile Rubberising</p>
            <p className="print-tagline-sm">Polyurea & Rubber Coatings</p>
          </div>
          <div className="print-right">
            <h2 className="print-title">QUOTATION</h2>
            <p className="print-meta">Quote Date: {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="print-meta">Quote Number: {quoteNumber}</p>
          </div>
        </div>

        <div className="print-section">
          <h3 className="print-section-title">Bill To:</h3>
          <p className="print-client-name">{data.clientName || "—"}</p>
          <p>{data.clientPhone || "—"}</p>
          {data.clientEmail && <p>{data.clientEmail}</p>}
          {data.siteAddress && <p>Site: {data.siteAddress}</p>}
        </div>

        <div className="print-section">
          <h3 className="print-section-title">Job Description</h3>
          <p>{data.jobType === "VEHICLE" ? `Vehicle Coating: ${data.vehicleDetails || "—"}` : data.jobType === "CONTAINER" ? `Container: ${CONTAINER_SIZE_LABELS[data.containerSize]} - ${CONTAINER_SCOPE_LABELS[data.containerScope]} x ${data.containerQuantity}` : "Industrial Coating"}</p>
          {data.serviceLocation && <p>Location: {SERVICE_LOCATION_LABELS[data.serviceLocation]}</p>}
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="text-center">Qty</th>
              <th className="text-center">Unit</th>
              <th className="text-right">Total (ZAR)</th>
            </tr>
          </thead>
          <tbody>
            {allLines.map((line) => {
              const qty = parseQuantity(line.quantity, line.unit);
              const price = parseRands(line.unitPrice);
              const total = qty !== null && price !== null ? Math.round((price * qty) / 1000) : 0;
              return (
                <tr key={line.id}>
                  <td>{line.description}</td>
                  <td className="text-center">{line.quantity}</td>
                  <td className="text-center">{line.unit === "SQM" ? "m\u00B2" : "each"}</td>
                  <td className="text-right font-semibold">{formatZar(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="print-totals-section">
          <div className="print-totals-row print-total-due">
            <span>TOTAL DUE:</span>
            <span>{formatZar(totals.total)}</span>
          </div>
        </div>

        {data.notes && (
          <div className="print-section">
            <h3 className="print-section-title">Notes</h3>
            <p>{data.notes}</p>
          </div>
        )}

        <div className="print-section">
          <h3 className="print-section-title">Terms &amp; Conditions</h3>
          <ul className="print-terms">
            <li>Areas are approximate. Final price confirmed after inspection.</li>
            <li>Valid for 30 days from date of issue.</li>
            <li>Payment due upon acceptance of quote.</li>
          </ul>
        </div>

        <div className="print-footer-thanks">
          <p><em>Thank you for your business</em></p>
        </div>
      </div>
    </div>
  );
}
