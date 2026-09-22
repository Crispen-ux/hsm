-- CreateEnum
CREATE TYPE "job_type" AS ENUM ('VEHICLE', 'CONTAINER', 'INDUSTRIAL');

-- CreateEnum
CREATE TYPE "container_size" AS ENUM ('FT20', 'FT40', 'FT40_HC', 'OTHER');

-- CreateEnum
CREATE TYPE "container_scope" AS ENUM ('FLOOR_ONLY', 'INTERIOR_FULL', 'EXTERIOR_ONLY', 'FULL_SHELL');

-- CreateEnum
CREATE TYPE "service_location" AS ENUM ('ON_SITE', 'IN_YARD');

-- CreateEnum
CREATE TYPE "line_unit" AS ENUM ('EACH', 'SQM');

-- CreateEnum
CREATE TYPE "service_interest" AS ENUM ('BAKKIE_BED', 'FULL_VEHICLE', 'TRAILER', 'CONTAINER', 'INDUSTRIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('CREW', 'ADMIN');

-- CreateTable
CREATE TABLE "crew_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'CREW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crew_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "service_interest" "service_interest" NOT NULL,
    "vehicle_make" TEXT,
    "vehicle_model" TEXT,
    "container_size" "container_size",
    "container_scope" "container_scope",
    "container_quantity" INTEGER,
    "service_location" "service_location",
    "site_location" TEXT,
    "site_access_notes" TEXT,
    "has_photos" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEBSITE',
    "status" "lead_status" NOT NULL DEFAULT 'NEW',
    "consent_given_at" TIMESTAMP(3) NOT NULL,
    "ip_hash" TEXT,
    "reference_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "job_type" "job_type" NOT NULL DEFAULT 'VEHICLE',
    "status" "invoice_status" NOT NULL DEFAULT 'DRAFT',
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "vehicle_details" TEXT,
    "asset_details" TEXT,
    "container_size" "container_size",
    "container_scope" "container_scope",
    "container_quantity" INTEGER,
    "service_location" "service_location",
    "site_address" TEXT,
    "raw_voice_transcript" TEXT,
    "subtotal_cents" INTEGER NOT NULL,
    "vat_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "deposit_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "unit" "line_unit" NOT NULL DEFAULT 'EACH',
    "quantity_milli" INTEGER NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "line_total_cents" INTEGER NOT NULL,
    "tier_key" TEXT,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_counters" (
    "year" INTEGER NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "crew_users_email_key" ON "crew_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leads_reference_code_key" ON "leads"("reference_code");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_idempotency_key_key" ON "invoices"("idempotency_key");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");

-- CreateIndex
CREATE INDEX "invoices_created_by_id_idx" ON "invoices"("created_by_id");

-- CreateIndex
CREATE INDEX "invoices_client_phone_idx" ON "invoices"("client_phone");

-- CreateIndex
CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines"("invoice_id");

-- CreateIndex
CREATE INDEX "rate_limit_buckets_window_start_idx" ON "rate_limit_buckets"("window_start");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "crew_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
