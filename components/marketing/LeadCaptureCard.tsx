"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { submitLead } from "@/app/actions/leads";
import { Field } from "@/components/ui/Field";
import { CONTAINER_SCOPES, CONTAINER_SCOPE_LABELS, SERVICE_LOCATION_LABELS } from "@/lib/domain";
import { parseQuotePrefill } from "@/lib/quote-link";
import type { FieldErrors } from "@/lib/result";
import { SITE_CONFIG, whatsappHref } from "@/lib/site-config";

type LeadState = Awaited<ReturnType<typeof submitLead>> | null;
type Values = Record<string, string>;

const DEFAULT_VALUES: Values = {
  serviceInterest: "FULL_VEHICLE",
  containerSize: "FT40",
  containerScope: "FLOOR_ONLY",
  containerQuantity: "1",
  serviceLocation: "ON_SITE",
};

const SERVICES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "FULL_VEHICLE", label: "Vehicle" },
  { value: "CONTAINER", label: "Container" },
  { value: "INDUSTRIAL", label: "Industrial" },
];

const SIZES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "FT20", label: "20ft" },
  { value: "FT40", label: "40ft" },
  { value: "FT40_HC", label: "40ft high cube" },
];

const LOCATIONS = ["ON_SITE", "IN_YARD"] as const;
const NO_ERRORS: readonly string[] = [];

export function LeadCaptureCard() {
  const [state, formAction, pending] = useActionState<LeadState, FormData>(submitLead, null);
  const [values, setValues] = useState<Values>(DEFAULT_VALUES);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const prefill = parseQuotePrefill(window.location.search);
    if (Object.keys(prefill).length === 0) {
      return;
    }
    const impliesContainer = prefill.size !== undefined || prefill.scope !== undefined || prefill.quantity !== undefined;
    const service =
      prefill.service === "CONTAINER" || impliesContainer
        ? "CONTAINER"
        : prefill.service === "INDUSTRIAL"
          ? "INDUSTRIAL"
          : "FULL_VEHICLE";
    setValues((previous) => ({
      ...previous,
      serviceInterest: service,
      ...(prefill.size ? { containerSize: prefill.size } : {}),
      ...(prefill.scope ? { containerScope: prefill.scope } : {}),
      ...(prefill.quantity !== undefined ? { containerQuantity: String(prefill.quantity) } : {}),
      ...(prefill.location ? { serviceLocation: prefill.location } : {}),
    }));
    setFormKey((key) => key + 1);
  }, []);

  const onChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) ||
      !target.name
    ) {
      return;
    }
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? (target.checked ? "on" : "") : target.value;
    setValues((previous) => ({ ...previous, [target.name]: value }));
  };

  if (state?.ok) {
    return <Success referenceCode={state.data.referenceCode} />;
  }

  const error = state && !state.ok ? state.error : null;
  const fieldErrors: FieldErrors = error?.fieldErrors ?? {};
  const errorsFor = (name: string): readonly string[] => fieldErrors[name] ?? NO_ERRORS;
  const value = (name: string): string => values[name] ?? "";
  const invalid = (name: string): true | undefined => (errorsFor(name).length > 0 ? true : undefined);
  const describedBy = (name: string): string | undefined => (errorsFor(name).length > 0 ? `lead-${name}-error` : undefined);

  return (
    <div id="quote" className="chamfer-2 plate scroll-mt-24">
      <div className="chamfer-2 plate-inner relative overflow-hidden">
        <div className="hazard-stripe" aria-hidden />
        <div className="perforated-edge absolute bottom-0 left-0 top-[6px] hidden w-7 md:block" aria-hidden />
        <div className="px-5 pb-8 pt-7 sm:px-8 md:pl-14">
          <h2 className="display-wide text-chrome text-[clamp(1.6rem,3.4vw,2.25rem)]">Get a quote</h2>
          <p className="mt-3 max-w-[52ch] text-zinc-400">
            Tell us what needs coating and where it is. We reply with a price, or a time to inspect the job first.
          </p>

          <form action={formAction} onChange={onChange} className="lead-form mt-8" noValidate>
            <div key={formKey} className="space-y-7">
              <fieldset>
                <legend className="text-sm text-zinc-300">What needs coating?</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {SERVICES.map((service) => (
                    <label key={service.value} className="choice-plate">
                      <input
                        type="radio"
                        name="serviceInterest"
                        value={service.value}
                        defaultChecked={value("serviceInterest") === service.value}
                      />
                      <span className="chamfer">{service.label}</span>
                    </label>
                  ))}
                </div>
                {errorsFor("serviceInterest").length > 0 ? (
                  <p className="mt-1 text-sm text-hawk-gold">Choose what needs coating.</p>
                ) : null}
              </fieldset>

              <div>
                <div className="lead-panel lead-panel-vehicle">
                  <div className="grid gap-6 sm:grid-cols-2">
                  <Field id="lead-vehicleMake" label="Vehicle make" errors={errorsFor("vehicleMake")}>
                    <input
                      id="lead-vehicleMake"
                      name="vehicleMake"
                      type="text"
                      autoComplete="off"
                      placeholder="Toyota"
                      defaultValue={value("vehicleMake")}
                      className="field-input"
                      aria-invalid={invalid("vehicleMake")}
                      aria-describedby={describedBy("vehicleMake")}
                    />
                  </Field>
                  <Field id="lead-vehicleModel" label="Vehicle model" errors={errorsFor("vehicleModel")}>
                    <input
                      id="lead-vehicleModel"
                      name="vehicleModel"
                      type="text"
                      autoComplete="off"
                      placeholder="Hilux"
                      defaultValue={value("vehicleModel")}
                      className="field-input"
                      aria-invalid={invalid("vehicleModel")}
                      aria-describedby={describedBy("vehicleModel")}
                    />
                  </Field>
                  <p className="text-sm text-zinc-400 sm:col-span-2">
                    Say in the message below whether you want the bed, the full vehicle or a trailer coated.
                  </p>
                  </div>
                </div>

                <div className="lead-panel lead-panel-container">
                  <div className="grid gap-6 sm:grid-cols-2">
                  <fieldset className="sm:col-span-2">
                    <legend className="text-sm text-zinc-300">Container size</legend>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {SIZES.map((size) => (
                        <label key={size.value} className="choice-plate">
                          <input type="radio" name="containerSize" value={size.value} defaultChecked={value("containerSize") === size.value} />
                          <span className="chamfer">{size.label}</span>
                        </label>
                      ))}
                    </div>
                    {errorsFor("containerSize").length > 0 ? <p className="mt-1 text-sm text-hawk-gold">Choose a container size.</p> : null}
                  </fieldset>
                  <Field id="lead-containerScope" label="Surfaces to coat" errors={errorsFor("containerScope")}>
                    <select
                      id="lead-containerScope"
                      name="containerScope"
                      defaultValue={value("containerScope")}
                      className="field-input"
                      aria-invalid={invalid("containerScope")}
                      aria-describedby={describedBy("containerScope")}
                    >
                      {CONTAINER_SCOPES.map((scope) => (
                        <option key={scope} value={scope}>
                          {CONTAINER_SCOPE_LABELS[scope]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id="lead-containerQuantity" label="How many containers" errors={errorsFor("containerQuantity")}>
                    <input
                      id="lead-containerQuantity"
                      name="containerQuantity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={50}
                      defaultValue={value("containerQuantity")}
                      className="field-input"
                      aria-invalid={invalid("containerQuantity")}
                      aria-describedby={describedBy("containerQuantity")}
                    />
                  </Field>
                  <fieldset className="sm:col-span-2">
                    <legend className="text-sm text-zinc-300">Where will the work happen?</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {LOCATIONS.map((location) => (
                        <label key={location} className="choice-plate">
                          <input type="radio" name="serviceLocation" value={location} defaultChecked={value("serviceLocation") === location} />
                          <span className="chamfer">{location === "ON_SITE" ? "We come to you" : "You bring it to our yard"}</span>
                        </label>
                      ))}
                    </div>
                    <p className="sr-only">{SERVICE_LOCATION_LABELS.ON_SITE} or {SERVICE_LOCATION_LABELS.IN_YARD}</p>
                  </fieldset>
                  <Field id="lead-siteLocation" label="Town or suburb" errors={errorsFor("siteLocation")}>
                    <input
                      id="lead-siteLocation"
                      name="siteLocation"
                      type="text"
                      autoComplete="address-level2"
                      defaultValue={value("siteLocation")}
                      className="field-input"
                      aria-invalid={invalid("siteLocation")}
                      aria-describedby={describedBy("siteLocation")}
                    />
                  </Field>
                  <Field id="lead-siteAccessNotes" label="Access notes" hint="optional" errors={errorsFor("siteAccessNotes")}>
                    <input
                      id="lead-siteAccessNotes"
                      name="siteAccessNotes"
                      type="text"
                      defaultValue={value("siteAccessNotes")}
                      className="field-input"
                      aria-describedby={describedBy("siteAccessNotes")}
                    />
                  </Field>
                  </div>
                </div>

                <div className="lead-panel lead-panel-industrial">
                  <p className="text-zinc-400">
                    Industrial work is quoted after we see the surface. Describe what it is, roughly how big it is and where it is in the
                    message below.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field id="lead-fullName" label="Your name" errors={errorsFor("fullName")}>
                  <input
                    id="lead-fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    defaultValue={value("fullName")}
                    className="field-input"
                    aria-invalid={invalid("fullName")}
                    aria-describedby={describedBy("fullName")}
                  />
                </Field>
                <Field id="lead-phone" label="Phone number" errors={errorsFor("phone")}>
                  <input
                    id="lead-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="082 123 4567"
                    defaultValue={value("phone")}
                    className="field-input"
                    aria-invalid={invalid("phone")}
                    aria-describedby={describedBy("phone")}
                  />
                </Field>
                <Field id="lead-email" label="Email" hint="optional" errors={errorsFor("email")} className="sm:col-span-2">
                  <input
                    id="lead-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    defaultValue={value("email")}
                    className="field-input"
                    aria-invalid={invalid("email")}
                    aria-describedby={describedBy("email")}
                  />
                </Field>
                <Field id="lead-message" label="Message" hint="optional" errors={errorsFor("message")} className="sm:col-span-2">
                  <textarea
                    id="lead-message"
                    name="message"
                    rows={3}
                    defaultValue={value("message")}
                    className="field-input min-h-[96px] resize-y"
                    aria-invalid={invalid("message")}
                    aria-describedby={describedBy("message")}
                  />
                </Field>
              </div>

              <div className="space-y-4">
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 text-zinc-300">
                  <input
                    type="checkbox"
                    name="hasPhotos"
                    defaultChecked={value("hasPhotos") === "on"}
                    className="h-5 w-5 shrink-0 accent-[#b91c1c]"
                  />
                  I can send photos of the job
                </label>
                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="consent"
                      defaultChecked={value("consent") === "on"}
                      aria-invalid={invalid("consent")}
                      aria-describedby={describedBy("consent")}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[#b91c1c]"
                    />
                    <span>
                      I agree that Hawk Mobile Rubberising may store and use my details to respond to this request, in line with POPIA.
                    </span>
                  </label>
                  {errorsFor("consent").length > 0 ? (
                    <p id="lead-consent-error" className="mt-1 text-sm text-hawk-gold">
                      {errorsFor("consent").join(" ")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website
                <input name="website" type="text" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div aria-live="polite" className="mt-6">
              {error ? (
                <p role="alert" className="border-l-2 border-hawk-gold pl-3 text-sm text-hawk-gold">
                  {error.message}
                </p>
              ) : null}
            </div>

            <button type="submit" disabled={pending} className="btn btn-primary chamfer mt-4 w-full">
              {pending ? "Sending" : "Send quote request"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Success({ referenceCode }: { referenceCode: string }) {
  const whatsapp = whatsappHref(
    SITE_CONFIG.contact.whatsappE164,
    `Hi, my quote reference is ${referenceCode}. Here are photos of the job.`,
  );
  const shareDetails = whatsappHref(
    SITE_CONFIG.contact.whatsappE164,
    `Hi, I would like a quote from Hawk Mobile Rubberising.\n\nMy reference code is: ${referenceCode}\n\nPlease contact me to discuss the job.`,
  );
  return (
    <div id="quote" className="chamfer-2 plate scroll-mt-24">
      <div className="chamfer-2 plate-inner">
        <div className="hazard-stripe" aria-hidden />
        <div className="px-5 pb-8 pt-7 sm:px-8 md:pl-14" role="status">
          <h2 className="display-wide text-chrome text-[clamp(1.6rem,3.4vw,2.25rem)]">Request received</h2>
          <p className="mt-4 text-zinc-300">We will contact you on the number you gave. Quote reference:</p>
          <p className="mt-2 font-mono text-2xl tabular-nums text-zinc-50">{referenceCode}</p>
          {whatsapp ? (
            <a href={whatsapp} rel="noopener noreferrer" target="_blank" className="btn btn-secondary chamfer mt-6">
              Send photos on WhatsApp
            </a>
          ) : null}
          {shareDetails ? (
            <a href={shareDetails} rel="noopener noreferrer" target="_blank" className="btn btn-secondary chamfer mt-3">
              Share quote details on WhatsApp
            </a>
          ) : null}
          <p className="mt-6 text-sm text-zinc-400">
            Need to send another request? <a href="/#quote" className="text-zinc-200 underline">Start a new one</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
