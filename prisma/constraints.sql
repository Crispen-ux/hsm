ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_total_matches_parts"
    CHECK ("total_cents" = "subtotal_cents" + "vat_cents"),
  ADD CONSTRAINT "invoices_amounts_non_negative"
    CHECK ("subtotal_cents" >= 0 AND "vat_cents" >= 0 AND "total_cents" >= 0 AND "deposit_cents" >= 0),
  ADD CONSTRAINT "invoices_deposit_within_total"
    CHECK ("deposit_cents" <= "total_cents"),
  ADD CONSTRAINT "invoices_vehicle_requires_details"
    CHECK ("job_type" <> 'VEHICLE' OR "vehicle_details" IS NOT NULL),
  ADD CONSTRAINT "invoices_container_requires_spec"
    CHECK (
      "job_type" <> 'CONTAINER'
      OR ("container_size" IS NOT NULL AND "container_scope" IS NOT NULL AND "container_quantity" IS NOT NULL)
    ),
  ADD CONSTRAINT "invoices_container_quantity_range"
    CHECK ("container_quantity" IS NULL OR "container_quantity" BETWEEN 1 AND 50);

ALTER TABLE "invoice_lines"
  ADD CONSTRAINT "invoice_lines_amounts_non_negative"
    CHECK ("quantity_milli" > 0 AND "unit_price_cents" >= 0 AND "line_total_cents" >= 0);

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_container_quantity_range"
    CHECK ("container_quantity" IS NULL OR "container_quantity" BETWEEN 1 AND 50);
