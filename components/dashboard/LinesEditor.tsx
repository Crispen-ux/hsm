"use client";

import { Field } from "@/components/ui/Field";
import { ProductSelect } from "@/components/dashboard/ProductSelect";
import type { DraftLine, FieldErrorMap } from "@/lib/invoice-draft";
import type { CatalogueProduct } from "@/lib/product-catalogue";
import { formatZar, lineTotalCentsForQuantity, MoneyRangeError, parseRandsToCents } from "@/lib/money";
import { parseQuantityToMilli } from "@/lib/quantity";

interface LinesEditorProps {
  lines: readonly DraftLine[];
  errors: FieldErrorMap;
  onChange: (key: string, patch: Partial<DraftLine>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onRemoveAutoLine?: (key: string) => void;
  onProductSelect?: (key: string, product: CatalogueProduct) => void;
}

function lineTotal(line: DraftLine): string | null {
  const quantity = parseQuantityToMilli(line.quantity, line.unit);
  const price = parseRandsToCents(line.unitPrice);
  if (quantity === null || price === null) {
    return null;
  }
  try {
    return formatZar(lineTotalCentsForQuantity(price, quantity));
  } catch (error) {
    if (error instanceof MoneyRangeError) {
      return null;
    }
    throw error;
  }
}

export function LinesEditor({ lines, errors, onChange, onAdd, onRemove, onRemoveAutoLine, onProductSelect }: LinesEditorProps) {
  return (
    <section aria-labelledby="lines-title">
      <h2 id="lines-title" className="display-narrow text-chrome text-2xl">
        Lines
      </h2>
      {errors.lines ? <p className="mt-2 text-sm text-hawk-gold">{errors.lines}</p> : null}

      <ul className="mt-4 space-y-4" data-testid="lines">
        {lines.map((line, index) => {
          const total = lineTotal(line);
          const errorFor = (field: string) => {
            const message = errors[`lines.${index}.${field}`];
            return message ? [message] : undefined;
          };
          return (
            <li key={line.key} className="border border-hawk-obsidian-border bg-hawk-obsidian-card p-4" data-testid="line">
              {!line.auto && onProductSelect && (
                <div className="mb-3">
                  <ProductSelect
                    id={`f-lines-${index}-product`}
                    label="Pick from catalogue"
                    hint="optional"
                    onSelect={(product) => onProductSelect(line.key, product)}
                  />
                </div>
              )}
              <Field id={`f-lines-${index}-description`} label="Description" errors={errorFor("description")}>
                <input
                  id={`f-lines-${index}-description`}
                  type="text"
                  value={line.description}
                  onChange={(event) => onChange(line.key, { description: event.target.value })}
                  className="field-input"
                  aria-invalid={errorFor("description") ? true : undefined}
                />
              </Field>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Field id={`f-lines-${index}-quantityMilli`} label={line.unit === "SQM" ? "Area (m²)" : "Quantity"} errors={errorFor("quantityMilli")}>
                  <input
                    id={`f-lines-${index}-quantityMilli`}
                    type="text"
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(event) => onChange(line.key, { quantity: event.target.value })}
                    className="field-input font-mono tabular-nums"
                    aria-invalid={errorFor("quantityMilli") ? true : undefined}
                  />
                </Field>
                <Field id={`f-lines-${index}-unitPriceCents`} label={line.unit === "SQM" ? "Price per m² (R)" : "Price (R)"} errors={errorFor("unitPriceCents")}>
                  <input
                    id={`f-lines-${index}-unitPriceCents`}
                    type="text"
                    inputMode="decimal"
                    value={line.unitPrice}
                    onChange={(event) => onChange(line.key, { unitPrice: event.target.value })}
                    className="field-input font-mono tabular-nums"
                    aria-invalid={errorFor("unitPriceCents") ? true : undefined}
                  />
                </Field>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">
                  {line.auto ? "Suggested. Edit or remove." : "Your line"}
                </p>
                <div className="flex items-center gap-3">
                  <p className="font-mono tabular-nums text-zinc-50">{total ?? "-"}</p>
                  <button
                    type="button"
                    onClick={() => line.auto && onRemoveAutoLine ? onRemoveAutoLine(line.key) : onRemove(line.key)}
                    className="min-h-[44px] px-2 text-sm text-zinc-300 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button type="button" onClick={onAdd} className="btn btn-secondary chamfer mt-4" data-testid="add-line">
        Add a line
      </button>
    </section>
  );
}
