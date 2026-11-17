# Pistyn | Performance Hub

A digital vehicle maintenance book: service history, receipts, maintenance schedules, issues and running costs for every car, in one place. Hosted on Netlify with Firebase (Auth, Firestore, Storage) on the free plan.

## Features

- **Garage & logbook** per car: profile (make, model, year, chassis/engine no., purchase details), current mileage, road tax and insurance expiry, mark as sold
- **Service logs** with work done, cost breakdown (parts/labour), warranties, workshop details, invoice number and multiple receipts/photos
- **Maintenance schedule** per car (by KM and/or months) with due / overdue status, and a recommended starter schedule
- **Issues & recommendations** log for problems noticed or work the workshop advised
- **Expenses**: spending by month, type and car, cost per KM, 3/6/12-month cost forecast and a suggested monthly set-aside
- **Parts library** with reliability rating and how long each part lasted
- **Exports**: printable service report (Save as PDF), calendar reminders (.ics), full JSON backup and CSV spreadsheet
- Works offline for viewing (installable app)

All amounts are in Malaysian Ringgit (RM).

## Run locally

Prerequisite: Node.js 20+

```bash
npm ci --legacy-peer-deps
npm run dev
```

Open http://localhost:3000. The app starts in demo mode (sample data saved in your browser). Add `?live` to the URL to sign in and use your real Firebase data.

## Deploy

1. **Firebase rules first.** In the Firebase Console open Firestore Database, choose the database
   `ai-studio-439fa0fd-9f96-40ec-908e-c97b1ed2fffa`, go to **Rules**, paste in `firestore.rules`, and click **Publish**.
   Optionally do the same for Storage with `storage.rules`.
2. **Then the app.** `npm run build` and deploy the `dist` folder to Netlify (or push, if Netlify builds from Git with build command `npm run build` and publish directory `dist`).

Netlify does not deploy Firebase rules, so step 1 is always done in the Firebase Console.

## Testing against local Firebase emulators

`VITE_USE_EMULATORS=true npm run dev` points the app at the Firebase emulators (Auth 9099, Firestore 8086, Storage 9199) instead of the live project. Never set this variable on Netlify.
