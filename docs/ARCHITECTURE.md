# Architecture and Vercel deployment note

## 1. Decision: modular monolith, not separately deployed microservices

Vercel runs every route handler, Server Action and page render as a serverless function that scales independently. The platform already gives most of what microservices are chosen for: independent scaling, isolated failures and per-route resource limits.

Splitting into separately deployed services would cost more than it returns here:

| Concern | Separate services | Modular monolith on Vercel |
|---|---|---|
| Latency | Extra network hop plus cold start per call | In-process function calls |
| Auth | Service-to-service tokens to build and rotate | One session check |
| Database | Each service needs pooled connections, and Neon's free tier has limits | One pooled connection path |
| Ops | Several projects, env sets and deploy pipelines | One project |
| Team | One crew, one owner | Simple |

**We build one Next.js project with hard internal service boundaries**, so any module can be extracted later without a rewrite.

### Internal services (bounded contexts)

| Service | Owns | Lives in | Talks to |
|---|---|---|---|
| Pricing | Tier and rate config, container geometry, indicative quotes | `lib/pricing-tiers.ts`, `lib/container-specs.ts`, `lib/container-quote.ts` | Money |
| Money | Integer-cent maths, VAT, formatting | `lib/money.ts` | none |
| Voice | Transcript normalization and parsing | `lib/speech-parser.ts`, `lib/vehicle-map.ts` | Pricing, Money |
| Leads | Lead capture, rate limiting | `app/actions/leads.ts`, `lib/services/leads.ts` | Validation, DB |
| Invoicing | Invoices, numbering, idempotency, status rules | `app/actions/invoices.ts`, `lib/services/invoices.ts`, `lib/invoice-status.ts` | Pricing, Money, DB |
| Identity | Crew auth and sessions | `auth.config.ts`, `lib/auth.ts`, `lib/session.ts`, `middleware.ts` | DB |

**Boundary rules (enforced by `lib/boundaries.test.ts`, which runs with the normal test suite):**
1. `lib/money.ts`, `lib/domain.ts`, `lib/phone.ts` and `lib/sanitize.ts` import nothing from the app.
2. Pages and components call Server Actions and `lib` functions only, never Prisma directly.
3. Only the data-access layer may import `@prisma/client`: `lib/db.ts`, `lib/rate-limit.ts`, `lib/services/*` and `prisma/seed.ts`. Server Actions call services and never touch Prisma directly.
4. Marketing routes never import from the dashboard tree.

### When to extract a real service

Extract only when there is a concrete trigger:
- **Long-running or bursty work**, such as PDF invoice generation or bulk WhatsApp/SMS notifications, that would hit function time limits or slow user requests.
- **A different runtime need**, such as native binaries or heavy libraries.
- **A separate team or release cadence.**

If a trigger appears: convert to a Turborepo monorepo (`apps/web`, `packages/domain`, `packages/db`), deploy the extracted worker as its own Vercel project, and call it through a signed HTTP request or a queue (Upstash QStash and Inngest both have free tiers). Because the domain code is dependency-light and tested, it moves into `packages/domain` unchanged.

## 2. Vercel topology

```
Browser / PWA
   |
Vercel CDN  ---- static marketing pages (prerendered, cached at the edge)
   |
Vercel Functions (Node.js runtime)
   |- Server Actions: submitLead, createInvoice, listInvoices, updateInvoiceStatus
   |- Auth.js route: /api/auth/*
   |
Neon Postgres  ---- pooled connection (PgBouncer) for runtime
                ---- direct connection only for migrations
```

### Things to get right

1. **Hobby plan terms.** Vercel's free Hobby plan is restricted to personal, non-commercial use. A business site and crew tool likely needs the Pro plan. Verify current terms before launch. The Neon free tier is fine to start.
2. **Region placement.** Neon has no African region. Put the Vercel function region next to the Neon region (for South Africa, a European region is typically closest), not next to the users. Every Server Action makes several database round trips, so function-to-database latency dominates. Static marketing pages come from the CDN regardless. Confirm available regions in both dashboards.
3. **Two connection strings.** `DATABASE_URL` is the pooled `-pooler` host, used at runtime. `DIRECT_URL` is the unpooled host, used only by Prisma Migrate. Never use the direct URL from functions.
4. **Migrations.** Run `prisma migrate deploy` from a CI step (a GitHub Action on merge to main), not on every Vercel build, so a preview deploy can never migrate production.
5. **Preview environments.** Use the Neon-Vercel integration so each preview deployment gets its own database branch. This keeps test invoices out of production.
6. **Prisma on serverless.** `postinstall` runs `prisma generate`, and `lib/db.ts` (Phase 2) caches one client per function instance. If cold-start connection time becomes an issue, Prisma's Neon driver adapter is the next step.
7. **Rate limiting.** In-memory counters do not work across serverless instances. The schema includes a `rate_limit_buckets` table for a Postgres-backed limiter (Phase 2).
8. **Secrets.** `AUTH_SECRET`, `DATABASE_URL` and `DIRECT_URL` live in Vercel environment variables, scoped per environment. Nothing secret is prefixed `NEXT_PUBLIC_`.
9. **Function limits.** Server Actions here are short (validate, write, return). Keep each under a few seconds. Anything longer is an extraction trigger.
10. **PWA.** The service worker is served from the app origin. The offline invoice queue replays through the same Server Action, protected by the invoice `idempotencyKey`.
11. **Observability.** Vercel logs plus Speed Insights on marketing pages (for CLS and Core Web Vitals). No console logging in domain code.

## 3. Data integrity decisions

- Money is `Int` cents. Postgres `INTEGER` tops out at R21,474,836.47 per amount, far above any single job here. `lib/money.ts` rejects anything larger.
- Area and quantity are stored as `quantityMilli` (1000 = 1 unit or 1.000 m²).
- Line total = `roundHalfUp(unitPriceCents × quantityMilli ÷ 1000)`, in BigInt arithmetic.
- **VAT is computed once on the subtotal, rounded half up.** This assumes prices are VAT-exclusive. If your R5,200 is VAT-inclusive, tell me and I'll switch to `vatFromInclusive` (already implemented).
- Invoice numbers come from the `invoice_counters` table, incremented inside the same transaction as the invoice insert, giving gap-free `HAWK-YYYY-0001` numbering.
- `prisma/constraints.sql` adds database-level CHECKs (totals add up, deposit within total, job-type-specific required fields) so bad data cannot get in even if application code has a bug.
