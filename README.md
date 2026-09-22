# Hawk Mobile Rubberising

Marketing site plus field-crew invoicing tool. Next.js App Router, Prisma, Neon Postgres, deployed on Vercel.
See `docs/ARCHITECTURE.md` for the infrastructure note.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Domain core: Prisma schema, money maths, pricing, container specs, validation, voice parser, tests | Done |
| 2 | Next.js scaffold, Tailwind tokens, `lib/db.ts`, Auth.js, Server Actions, rate limiting, security headers | Done |
| 3 | Design system (Forged Instrument) and the four marketing pages | Done |
| 4 | Invoice engine: voice panel, review form, offline queue, PWA manifest and service worker | Done |
| 5 | Vercel deployment: CI migrations, Neon branching, env setup, Lighthouse pass | Done |

## Setup

```bash
npm install
npm run typecheck
npm test
```

`npm install` runs `prisma generate` (needs network access to Prisma's binaries).

Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (`npx auth secret`) and the `SEED_*` values. Then:

```bash
npm run db:seed     # creates the first ADMIN crew user
npm run dev
```

## First database migration

```bash
cp .env.example .env
npx prisma migrate dev --name init --create-only
```

Open the generated `prisma/migrations/<timestamp>_init/migration.sql` and append the contents of `prisma/constraints.sql` to the end. Then apply it:

```bash
npx prisma migrate dev
```

## Operator-supplied data (not invented)

These are typed as `null` and the UI will show "Quote on request" until you fill them:

- `lib/pricing-tiers.ts`: other vehicle tiers and their spoken keywords, container rate per m² for each scope, and the on-site mobilisation fee. Only `VEHICLE_FULL` = R5,200 is set.
- `lib/container-specs.ts`: the container exterior areas. The floor and interior areas are approximate. Set `CONTAINER_AREAS_VERIFIED = true` only after you have checked them against your own measurements.
- `lib/vehicle-map.ts`: add any other vehicles your crew commonly quotes.

## Phase 2 notes

**What exists:** Next.js 15 App Router scaffold, Tailwind tokens, self-hosted fonts (no Google Fonts requests), Auth.js v5 credentials login with 12-hour JWT sessions, Postgres-backed rate limiting, the Server Actions (`submitLead`, `createInvoice`, `listInvoices`, `updateInvoiceStatus`, `loginAction`, `logoutAction`), security headers, and a minimal home page, login page and dashboard shell. The full marketing pages arrive in Phase 3 and the invoice engine UI in Phase 4.

**Decisions**
- Crew see only their own invoices. Admins see all. Only admins can void a paid invoice. The seed script creates an `ADMIN`.
- Idempotent invoice creation: a repeated `idempotencyKey` from the same user returns the original invoice instead of creating a second one, which is what the Phase 4 offline queue relies on.
- The CSP allows `'unsafe-inline'` for scripts and styles. A nonce-based CSP would force every page to render dynamically and lose static marketing pages. The rest of the policy is strict (`frame-ancestors 'none'`, no third-party origins).
- The honeypot returns a normal-looking success without saving, so bots learn nothing.
- Sessions are JWTs and are not revoked when a user is deleted. They expire after 12 hours. Add a database session check if you need instant revocation.

**Known limitations**
- Not run against a live Postgres yet: the SQL in `lib/rate-limit.ts` and the transaction behaviour are covered by tests with fakes, not a real database. Run the VERIFY checklist below on your Neon dev branch first.
- `next-auth@beta` (v5) is still a beta release. Pin the exact version once you are happy with it.
- `npm audit` reports PostCSS advisories inside Next 15 and a moderate one in the Prisma CLI. They concern processing untrusted CSS and are not reachable here. Upgrading to Next 16 clears the PostCSS ones and is planned before launch.
- Expired rate-limit rows are not purged automatically. `purgeExpiredBuckets` exists and gets wired to a scheduled job in Phase 5.

## VERIFY checklist (needs your Neon database)

1. Create a Neon project and a dev branch, and put both connection strings in `.env`.
2. `npx prisma migrate dev --name init --create-only`, append `prisma/constraints.sql` to the generated `migration.sql`, then `npx prisma migrate dev`.
3. `npm run db:seed`, then `npm run dev`, and sign in at `/login`.
4. Open `/dashboard`. It should show "No invoices yet."
5. Sign out and visit `/dashboard/invoice-engine` directly. You should land on `/login`.
6. Submit the same lead six times from one browser within 15 minutes. The sixth should be rate limited.
7. Try five wrong passwords. The sixth attempt should say to wait 15 minutes.

## Phase 3 notes

**What exists:** the design system (`app/globals.css`, `components/ui`, `components/brand`), the four marketing pages (home with the quote form, capabilities, pricing with the container configurator, contact), sitemap, robots, JSON-LD, and a mobile menu built on a native `<dialog>`. The design plan and the changes I made to it are in `docs/DESIGN.md`.

**Verified in a real browser (headless Chromium against the production build)**
- 28 interaction checks pass: form panels switch, URL prefill works and ignores hostile values, the configurator maps zones to scopes and builds the right quote link, pricing tabs work from the URL hash, the mobile menu opens and closes with Escape, a failed submit shows a clear error and keeps what was typed, the headline fits on one line at 390, 768, 1024, 1280 and 1440px.
- Cumulative Layout Shift is 0.0000 on every page checked, including arriving with a prefilled quote link.
- axe-core reports no WCAG 2.1 A/AA violations on eight views. axe cannot measure text that uses the chrome gradient, so I checked it by hand: the darkest part of a headline glyph is roughly 3:1 against the background, which is the floor for large text.

**Supply these before launch (nothing is invented; missing values show as "On request" or "Quote on request")**
- `lib/site-config.ts`: phone, WhatsApp, email, branches with hours, warranty years, vehicles and containers coated, response time, the coating spec values, yard address and hours, and the before and after photos (the compare slider appears when both are set).
- `lib/pricing-tiers.ts`: the other vehicle tiers, the container rate per m² for each scope and the on-site fee. Once the rates are set, the configurator shows a live indicative price.
- `lib/container-specs.ts`: exterior areas for each container size.

**Please confirm these statements are true for Hawk**, because I wrote them as ordinary service descriptions and they are claims on your behalf
- The coating build-up on the capabilities page: primer, polyurethane layer and topcoat.
- The container uses (floors, waterproofing, corrosion protection) and the six process steps.
- "We come to you, or you bring it to our yard", and "VAT is added on the invoice" on the pricing page.

**Deviations from the master prompt, and why**
- The container configurator draws a cross-section, not an isometric box. Floor, walls and roof, and exterior are unambiguous in section, and it reads like an engineering drawing.
- Pricing tabs use the URL hash and CSS `:target`, not `role="tablist"`. They work without JavaScript, first paint is correct, and all three panels stay in the HTML. They behave as in-page links, not the ARIA tabs pattern.
- The home page's client JavaScript is 10 KB, but the total first load is 116 KB gzipped, so the "under 100 KB" target is not met. About 103 KB of that is the React and Next.js runtime shared by every page, and I cannot remove it without leaving Next.js. A realistic target is page-specific JavaScript under 15 KB.
- The eagle is a placeholder in `components/brand/EagleMark.tsx`. Send me the real logo as an SVG and I will replace it.

## Phase 4 notes

**What exists:** the field invoicing workspace at `/dashboard/invoice-engine` — push-to-talk voice capture with live highlighting, a manual typing fallback, a review form that prefills from what was understood, an editable line list, a totals readout, an offline queue backed by IndexedDB, a service worker, the app manifest and icons, and an install prompt.

**Verified against a real, disposable PostgreSQL database, not just mocks.** I installed Postgres in this sandbox, applied `prisma/schema.prisma` and `prisma/constraints.sql` as real DDL, and ran 26 integration tests against it: the rate limiter's SQL under concurrent load, invoice numbering under 25 simultaneous creates (gap-free, no duplicates), the same idempotency key sent 6 times at once (exactly one invoice, no burned number), racing status updates (exactly one wins), every CHECK constraint in `constraints.sql`, and that deleting a crew user with invoices is blocked while deleting an invoice cascades its lines. I mutation-tested this suite by breaking the rate limiter's increment and the numbering transaction one at a time; both were caught, then reverted.

**Verified in a real browser (headless Chromium against the production build), including with a valid session:**
- 64 checks pass, covering the manifest and icons, the service worker's install and cache behaviour, no Chrome installability errors, the full voice-to-form flow with live highlighting, all three microphone failure modes (denied, no speech, no connection) falling back to typing, the container voice example from the spec with a fractional area producing an exact total, validation errors all appearing together with focus moving to the first one, going offline mid-invoice and having it queue in IndexedDB with no client-computed totals in the stored payload, surviving a reload while offline, an uncached route offline showing the friendly "No signal" page instead of a browser error, and an unauthenticated visitor being redirected to `/login`.
- Two real bugs were caught this way and fixed: the container size and location radio inputs were missing their `value` attributes, so nothing was actually selected; and the sticky bottom action bar was covering the last field when scrolling to a validation error.

**Decisions**
- **Offline-first by design, not by accident.** Every invoice gets a client-generated `idempotencyKey` before it is ever sent. If the network drops between clicking "Issue" and getting a response, the invoice is queued locally instead of lost, and replaying it later is always safe because the server returns the original invoice for a repeated key.
- **The crew's typing always wins.** Once a field is edited by hand, later speech will never overwrite it. This is tracked per field, not per form.
- **Unknown areas are left blank, not guessed.** If a container's exterior area isn't in `lib/container-specs.ts`, the suggested line has no quantity rather than a made-up number the crew might miss checking.
- **A parked draft is restored after a reload**, validated against a schema first so a corrupted or tampered `localStorage` value is silently ignored rather than crashing the page.
- **The service worker only manages the dashboard.** Marketing pages are not offline-enabled, since a lead capture form has nothing useful to do without a network.
- **PWA icons and the eagle mark in the manifest are placeholders**, rendered from the same placeholder SVG as Phase 3. Send the real logo and I will regenerate `public/icons/*.png`.

**Known limitations**
- Speech recognition itself (the browser's `SpeechRecognition` API) cannot run in this headless environment, so the 64 browser checks use a fake recognition source that behaves like the real one, including its error codes. The parsing, form-filling, highlighting and offline logic are exercised for real; only the audio-to-text step is simulated. Please test the actual microphone on a phone before relying on it in the field.
- The offline queue currently syncs one invoice at a time in the browser tab that created it. If the crew closes the tab immediately after saving offline, the sync resumes next time that page is opened while online, via `visibilitychange`, the `online` event and a 30-second poll — not instantly in the background.
- I could not test the "Add to Home Screen" prompt itself interactively (`beforeinstallprompt` is Chromium-only and needs real user engagement heuristics), but Chrome's installability checker reports no errors against the manifest and service worker.

## VERIFY checklist additions for Phase 4

1. Open `/dashboard/invoice-engine` on a phone. Tap the microphone and say: "Hilux full, client Sipho, deposit five hundred." Confirm the form fills in and the highlighted words match what you said.
2. Turn on airplane mode mid-job, tap Issue, confirm. Confirm it shows "waiting to sync" and the sync badge updates. Turn airplane mode off and confirm it sends within about 30 seconds.
3. From your phone's browser menu, confirm "Add to Home Screen" is offered, and that the installed app opens straight to the invoice engine with no browser address bar.
4. Deny microphone permission when prompted and confirm the manual typing panel opens automatically.

## Phase 5 notes

**What exists:** production deployment infrastructure — GitHub Actions for CI migrations on merge to main, a Vercel cron job that purges expired rate-limit buckets daily at 03:00 UTC, and the `vercel.json` configuration.

**Deployment setup**

1. **CI migrations.** `.github/workflows/deploy.yml` runs `prisma migrate deploy` on every push to `main`, before the build step. A `concurrency` group ensures only one migration runs at a time. Migrations run against `DIRECT_URL` (the unpooled Neon host).

2. **Rate-limit cleanup.** `app/api/cron/purge-rate-limits/route.ts` is a GET endpoint protected by a `CRON_SECRET` bearer token. Vercel's cron feature calls it daily. Set `CRON_SECRET` in both `.env` and Vercel environment variables.

3. **Preview environments.** Enable the Neon-Vercel integration so each preview deployment gets its own database branch. Preview deploys skip the migration job (they only run on `main`).

**Vercel environment variables to set**

| Variable | Scope | Notes |
|---|---|---|
| `DATABASE_URL` | Production + Preview | Pooled Neon connection (`-pooler` host) |
| `DIRECT_URL` | Production + Preview | Unpooled Neon connection, used only by Prisma Migrate |
| `AUTH_SECRET` | Production + Preview | `npx auth secret` to generate |
| `NEXT_PUBLIC_SITE_URL` | Production | Your production domain (e.g. `https://hawk-mobile.vercel.app`) |
| `CRON_SECRET` | Production | Random string for cron endpoint auth |

**Known items**
- Vercel Hobby plan is restricted to personal, non-commercial use. A business site likely needs Pro. Verify before launch.
- Confirm Vercel function region matches Neon region (European region is closest to South Africa). Static marketing pages come from the CDN regardless.
- The placeholder eagle logo and PWA icons still need replacing before launch.
