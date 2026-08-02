# Yupana

Subscription billing and balance tracking for small businesses, installable
as a mobile app.

Generic recurring-billing core (`clients`/`plans`/`payments`), designed as a
**template**: each industry (water utility, gym, condo association...) is
resolved by configuration, without touching the core.

This repo ships with a **water utility (OTB)** vertical already wired up as
a reference example (`src/config/water.js` + sample data in
`scripts/water-demo-data.js`) — a community water board billing households a
monthly fee based on a contracted number of "cubos" of water.

## Features

- Recurring billing calculated on read (no scheduled jobs) — balance, next
  due date, and per-month ledger derived purely from plan/cycle/payments.
- Per-month charge overrides (discounts/exceptions on specific months) and
  date-range service pauses (skip billing for a period without cancelling),
  both with a required reason, kept as data — no separate client status.
- Two staff roles (admin/operator) enforced both in Firestore Rules and the
  UI, plus a per-operator permission (e.g. who can add new clients) —
  see `firestore.rules`.
- Last-change audit trail (who/when) on client edits, charge overrides, and
  status changes.
- CSV import (bulk client onboarding, with per-row validation and preview)
  and CSV export from the operator panel.
- Installable PWA with offline-capable writes (Firestore persistent local
  cache) — built for an operator on a phone with unreliable signal.
- Payment receipts (shareable image) and public per-client balance page
  (`/{token}`, no login required).

## Requirements

- Node.js 20+
- A Firebase account (Spark plan, free) — only needed for development
  against real data or for deployment.
- Java 21+ and `npm i -g firebase-tools` — **only** if you'll use
  `npm run dev:emulator` / `npm run test:rules` (fully local development,
  no real Firebase project).

## Local development

```
npm install
npm test          # vitest: balance logic + CSV parsing (pure, no Firestore)
npm run dev        # local server, against a real Firebase project
```

Copy `.env.example` to `.env` and fill it in with the config of a Firebase
project with **Firestore** and **Authentication (email/password)** enabled.
Then `npm run seed` creates the plans and sample clients for the active
vertical (see `scripts/water-demo-data.js`).

## Fully local development (no real Firebase project)

```
npm run dev:emulator
```

Starts the Firestore + Auth emulators, seeds the sample data, and launches
the dev server — all on your machine, never touching a real Firebase project
or the internet. Prints the operator panel URL, test credentials, and the
public `/{token}` link for each seeded client to the console.

Firestore's offline persistence is intentionally disabled against the
emulator (it would survive a reseed and show stale data) — it only kicks in
when running against a real Firebase project.

To test `firestore.rules` against the same emulator:

```
npm run test:rules
```

Runs `src/data/firestore.rules.test.js`: confirms role/permission boundaries
(public read scope, operator vs admin, per-operator permissions).

## Adapting this template to another vertical

1. Create `src/config/<industry>.js` with your own `currency`, `locale`,
   `clientTerm`, `paymentMethods`, and `customFields` (same shape as
   `src/config/water.js`).
2. Point `src/config/index.js` to your new file — it's the single extension
   point; no other core file (`src/App.jsx`, `src/core/ClientLookup.jsx`,
   etc.) should import a vertical config directly.
3. (Optional) write your own seed script with sample data for your industry,
   using `scripts/water-demo-data.js` + `scripts/seed-water-demo.js` as a
   reference for the expected shape.

## Roles and permissions

Two roles, stored in `staff/{uid}`: `admin` (full access — plans, billing
exceptions, staff, settings) and `operator` (registers payments and, unless
an admin revokes it per-operator, adds new clients). Staff log in with a
username, not an email (translated to a synthetic address under the hood —
see `src/core/staffLogin.js`); there is currently no self-service or
admin-assisted password reset (accepted limitation — would require a
backend this project doesn't otherwise have).

## Security rules

`firestore.rules` enforces the role/permission split server-side, not just
in the UI: public users can only `get` a client by their token (document ID)
and read the `clients/{id}/payments` subcollection for THAT id — never
`list` the `clients` collection. See `npm run test:rules` above for
automated verification.

## Deployment

1. Create a Firebase project (Spark plan), enable Firestore + Auth.
2. `firebase deploy --only firestore:rules`
3. Configure the repo secrets on GitHub (Settings → Secrets → Actions):
   `VITE_FIREBASE_*` (see `.env.example`) + `FIREBASE_SERVICE_ACCOUNT`
   (a service account with the Firebase Hosting Admin role, as JSON).
4. Every push to `main` deploys automatically via
   `.github/workflows/deploy.yml`.

Installing the PWA ("Add to Home Screen" / "Install app") requires HTTPS —
it won't offer to install over a plain HTTP LAN address during local
development, only once deployed.

## Structure

- `src/data/db.js` — sole access point to Firestore (core).
- `src/lib/balance.js` — pure balance calculation, charge overrides, service
  pauses (no Firestore, testable).
- `src/config/index.js` — single extension point: which vertical is active.
- `src/config/water.js` — water utility vertical config (fields, payment methods, currency).
- `src/core/` — generic UI: operator panel, client detail/ledger, public
  lookup, and modals (add/edit client, payments, charge overrides, service
  pause, plans/settings, staff roles, CSV import, receipts).
- `src/core/csv.js` — CSV read/write helpers (no external dependency).
- `src/firebase.js` — Firebase init, including offline persistence config.
- `scripts/water-demo-data.js` + `scripts/seed-water-demo*.js` — sample data and seed scripts for the water utility vertical.
