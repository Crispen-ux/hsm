"use client";

import { LinesEditor } from "@/components/dashboard/LinesEditor";
import { Field } from "@/components/ui/Field";
import {
  CONTAINER_SCOPES,
  CONTAINER_SCOPE_LABELS,
  CONTAINER_SIZE_LABELS,
  SERVICE_LOCATION_LABELS,
  type ContainerSize,
  type ServiceLocation,
} from "@/lib/domain";
import type { DraftLine, FieldErrorMap, InvoiceDraft } from "@/lib/invoice-draft";
import type { CatalogueProduct } from "@/lib/product-catalogue";
import { formatZar } from "@/lib/money";
import { VEHICLE_TIERS } from "@/lib/pricing-tiers";

interface ReviewFormProps {
  draft: InvoiceDraft;
  errors: FieldErrorMap;
  setField: <K extends keyof InvoiceDraft>(field: K, value: InvoiceDraft[K]) => void;
  onLineChange: (key: string, patch: Partial<DraftLine>) => void;
  onAddLine: () => void;
  onRemoveLine: (key: string) => void;
  onProductSelect?: (key: string, product: CatalogueProduct) => void;
}

const SIZES: readonly Exclude<ContainerSize, "OTHER">[] = ["FT20", "FT40", "FT40_HC"];
const LOCATIONS: readonly ServiceLocation[] = ["ON_SITE", "IN_YARD"];

function TextField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  inputMode?: "text" | "tel" | "decimal";
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
}) {
  const { id, label, value, onChange, error, inputMode, autoComplete, placeholder, hint } = props;
  return (
    <Field id={id} label={label} hint={hint} errors={error ? [error] : undefined}>
      <input
        id={id}
        type={inputMode === "tel" ? "tel" : "text"}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
    </Field>
  );
}

export function ReviewForm({ draft, errors, setField, onLineChange, onAddLine, onRemoveLine, onProductSelect }: ReviewFormProps) {
  return (
    <div className="mt-8 space-y-10">
      <section aria-labelledby="client-title">
        <h2 id="client-title" className="display-narrow text-chrome text-2xl">
          Client
        </h2>
        <div className="mt-4 grid gap-5">
          <TextField id="f-clientName" label="Name" value={draft.clientName} onChange={(value) => setField("clientName", value)} error={errors.clientName} autoComplete="off" />
          <TextField
            id="f-clientPhone"
            label="Phone"
            value={draft.clientPhone}
            onChange={(value) => setField("clientPhone", value)}
            error={errors.clientPhone}
            inputMode="tel"
            autoComplete="off"
            placeholder="082 123 4567"
          />
          <TextField
            id="f-clientEmail"
            label="Email"
            hint="optional"
            value={draft.clientEmail}
            onChange={(value) => setField("clientEmail", value)}
            error={errors.clientEmail}
            inputMode="text"
            autoComplete="email"
            placeholder="client@example.com"
          />
        </div>
      </section>

      <section aria-labelledby="job-title">
        <h2 id="job-title" className="display-narrow text-chrome text-2xl">
          The job
        </h2>

        {draft.jobType === "VEHICLE" ? (
          <div className="mt-4 grid gap-5">
            <TextField
              id="f-vehicleDetails"
              label="Vehicle"
              value={draft.vehicleDetails}
              onChange={(value) => setField("vehicleDetails", value)}
              error={errors.vehicleDetails}
              placeholder="Toyota Hilux double cab"
            />
            <Field id="f-vehicleTierKey" label="Tier">
              <select
                id="f-vehicleTierKey"
                value={draft.vehicleTierKey ?? ""}
                onChange={(event) => {
                  const tier = VEHICLE_TIERS.find((candidate) => candidate.key === event.target.value);
                  setField("vehicleTierKey", tier ? tier.key : null);
                }}
                className="field-input"
              >
                <option value="">No tier, I will add lines myself</option>
                {VEHICLE_TIERS.map((tier) => (
                  <option key={tier.key} value={tier.key}>
                    {tier.label}
                    {tier.priceCents === null ? "" : `, ${formatZar(tier.priceCents)}`}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        {draft.jobType === "CONTAINER" ? (
          <div className="mt-4 grid gap-5">
            <fieldset id="f-containerSize" tabIndex={-1}>
              <legend className="text-sm text-zinc-300">Container size</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {SIZES.map((size) => (
                  <label key={size} className="choice-plate">
                    <input type="radio" name="containerSize" value={size} checked={draft.containerSize === size} onChange={() => setField("containerSize", size)} />
                    <span className="chamfer">{CONTAINER_SIZE_LABELS[size]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field id="f-containerScope" label="Surfaces to coat">
              <select
                id="f-containerScope"
                value={draft.containerScope}
                onChange={(event) => {
                  const scope = CONTAINER_SCOPES.find((candidate) => candidate === event.target.value);
                  if (scope) {
                    setField("containerScope", scope);
                  }
                }}
                className="field-input"
              >
                {CONTAINER_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {CONTAINER_SCOPE_LABELS[scope]}
                  </option>
                ))}
              </select>
            </Field>

            <div id="f-containerQuantity" tabIndex={-1}>
              <p className="text-sm text-zinc-300">Containers</p>
              <div className="mt-2 flex items-center">
                <button
                  type="button"
                  aria-label="One fewer container"
                  disabled={draft.containerQuantity <= 1}
                  onClick={() => setField("containerQuantity", Math.max(1, draft.containerQuantity - 1))}
                  className="chamfer min-h-[48px] min-w-[48px] border border-zinc-700 text-lg disabled:opacity-40"
                >
                  &minus;
                </button>
                <output className="min-w-[3.5rem] text-center font-mono text-xl tabular-nums text-zinc-50">{draft.containerQuantity}</output>
                <button
                  type="button"
                  aria-label="One more container"
                  disabled={draft.containerQuantity >= 50}
                  onClick={() => setField("containerQuantity", Math.min(50, draft.containerQuantity + 1))}
                  className="chamfer min-h-[48px] min-w-[48px] border border-zinc-700 text-lg disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <fieldset id="f-serviceLocation" tabIndex={-1}>
              <legend className="text-sm text-zinc-300">Where</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {LOCATIONS.map((location) => (
                  <label key={location} className="choice-plate">
                    <input type="radio" name="serviceLocation" value={location} checked={draft.serviceLocation === location} onChange={() => setField("serviceLocation", location)} />
                    <span className="chamfer">{SERVICE_LOCATION_LABELS[location]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <TextField id="f-siteAddress" label="Site address" value={draft.siteAddress} onChange={(value) => setField("siteAddress", value)} error={errors.siteAddress} autoComplete="off" />
          </div>
        ) : null}

        {draft.jobType === "INDUSTRIAL" ? (
          <div className="mt-4 grid gap-5">
            <TextField id="f-assetDetails" label="What is being coated" value={draft.assetDetails} onChange={(value) => setField("assetDetails", value)} error={errors.assetDetails} />
            <TextField id="f-siteAddress" label="Site address" hint="optional" value={draft.siteAddress} onChange={(value) => setField("siteAddress", value)} error={errors.siteAddress} autoComplete="off" />
          </div>
        ) : null}
      </section>

      <LinesEditor lines={draft.lines} errors={errors} onChange={onLineChange} onAdd={onAddLine} onRemove={onRemoveLine} onProductSelect={onProductSelect} />

      <section aria-labelledby="deposit-title">
        <h2 id="deposit-title" className="display-narrow text-chrome text-2xl">
          Deposit
        </h2>
        <div className="mt-4">
          <TextField
            id="f-deposit"
            label="Deposit received (R)"
            hint="optional"
            value={draft.deposit}
            onChange={(value) => setField("deposit", value)}
            error={errors.depositCents}
            inputMode="decimal"
            placeholder="0.00"
          />
        </div>
      </section>
    </div>
  );
}
