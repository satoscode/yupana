# Yupana

Simple subscription billing and balance tracking for small businesses.

Generic recurring-billing core (`clients`/`plans`/`payments`), designed as a
**template**: each industry (water utility, gym, condo association...) is
resolved by configuration, without touching the core.

This repo ships with a **water utility (OTB)** vertical already wired up as
a reference example (`src/config/water.js` + sample data in
`scripts/water-demo-data.js`) — a community water board billing households a
monthly fee based on a contracted number of "cubos" of water.

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
npm test          # vitest: balance logic (src/lib/balance.js)
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

To test `firestore.rules` against the same emulator:

```
npm run test:rules
```

Runs `src/data/firestore.rules.test.js`: confirms a public client can only
read their own document and their own payments, and can never `list` the
full `clients` collection.

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

## Security rules

`firestore.rules` implements: authenticated operator with full access;
public users can only `get` a client by their token (document ID) and read
the `clients/{id}/payments` subcollection for THAT id — never `list` the
`clients` collection. See `npm run test:rules` above for automated
verification.

## Deployment

1. Create a Firebase project (Spark plan), enable Firestore + Auth.
2. `firebase deploy --only firestore:rules`
3. Configure the repo secrets on GitHub (Settings → Secrets → Actions):
   `VITE_FIREBASE_*` (see `.env.example`) + `FIREBASE_SERVICE_ACCOUNT`
   (a service account with the Firebase Hosting Admin role, as JSON).
4. Every push to `main` deploys automatically via
   `.github/workflows/deploy.yml`.

## Structure

- `src/data/db.js` — sole access point to Firestore (core).
- `src/lib/balance.js` — pure balance calculation (no Firestore, testable).
- `src/config/index.js` — single extension point: which vertical is active.
- `src/config/water.js` — water utility vertical config (fields, payment methods, currency).
- `src/core/` — generic UI (operator panel, detail view, modals, public lookup).
- `scripts/water-demo-data.js` + `scripts/seed-water-demo*.js` — sample data and seed scripts for the water utility vertical.
