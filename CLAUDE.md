# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server (bound to `0.0.0.0` per `vite.config.js`, so it's reachable from a phone on the same network for on-device testing)
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — run oxlint (rules in `.oxlintrc.json`: `react/rules-of-hooks` error, `react/only-export-components` warn)

There is no test suite configured in this repo.

## What this app is

A single-page PWA (React 19 + Vite + Tailwind v4 + `vite-plugin-pwa`) for bars to track fridge/shelf stock levels and generate a "shopping list" (picking list) of what needs to be restocked from the deposit. UI copy and comments are in Spanish (Argentina); the domain vocabulary matters when reading/writing code:

- **zona** (zone) — a physical location (fridge, shelf) holding products, each with an `icon`/`subtitle`.
- **item** / **producto** — a stock line tied to one zone, with `current` and `max` (ideal full stock) counts.
- **picking** / **carga** — the workflow of gathering missing stock from the deposit and bringing it to zones.
- **quiebre (de depósito)** — a "shortage": the deposit didn't have enough of an item to fully restock a zone.
- **responsable / runner** — the person currently on shift, attributed to updates.

## Architecture

All state lives in one hook, `src/hooks/useStock.js`, which is the single source of truth for the whole app. `App.jsx` calls `useStock()` once and prop-drills everything down into four top-level views (`HomeView`, `ZoneView`, `PickingView`, `SettingsView`) switched by a local `view` string state — there is no router.

Persistence is Firebase Firestore, not `localStorage` — the whole app state lives in a single document, `bars/{BAR_ID}` (`BAR_ID` from `VITE_BAR_ID`, default `"default"`; see `src/lib/firebase.js`). `useStock` seeds that document with `ZONES`/`INITIAL_ITEMS` on first run if it doesn't exist yet, then subscribes to it with `onSnapshot` for real-time updates — no polling. Every mutator (`increment`, `addZone`, `setRunnerName`, etc.) writes straight to Firestore via `updateDoc`; none of them touch local state directly, so the `onSnapshot` callback is the *only* place local state changes. This is single-tenant only (one bar, one document) by design — if that ever needs to change, `BAR_ID` is the one thing to parametrize further (e.g. from a URL or login).

Within that document, `items` is stored as a map (`{ [itemId]: { zoneId, name, max, current } }`), not an array, specifically so per-item ops can use Firestore's atomic `increment()` on a single field path (`items.<id>.current`) without a transaction. `itemsMapFromArray`/`itemsArrayFromMap` in `useStock.js` convert at the hook boundary, so every view still sees a plain `items` array like before. `zones` stays a plain array, overwritten wholesale on every catalog edit — it changes rarely enough that this is fine.

`increment`/`decrement`/`setFull`/`setEmpty` use Firestore's atomic `increment()` (for `setFull`/`setEmpty`, the delta is computed against the locally-cached `current` before sending). Bigger operations — `finalizeChecked`/`reset`, `applyScanCounts`, and the `SettingsView` catalog ops (`addZone`/`updateZone`/`removeZone`/`addProduct`/`updateProduct`/`removeProduct`) — write a merge/overwrite of just the fields they touch in a single `updateDoc`, **not** wrapped in a Firestore transaction. This is intentional, not an oversight: with one runner per shift (today's normal case), there's no real concurrent-write risk. If multiple runners ever use the app at the same time, these ops should be hardened with real transactions.

Key data flow through `useStock`:
- `items` (flat array, each with `zoneId`) + `zones` are the two persisted entities. `itemsByZone` is a derived `Map` grouping items by zone.
- `pickQty` (object `{ [itemId]: qty }`) tracks how much of each missing item has been confirmed as "gathered from the deposit" during an active picking session — it is *not* the same as "fully restocked" when the deposit falls short.
- `pickingByZone` derives the picking-list UI grouping from `itemsByZone` + `pickQty`, only including items where `current < max`.
- `finalizeChecked` applies `pickQty` onto `items` (increasing `current`, capped at `max`), and appends to `shortages` for any item where the confirmed quantity was less than what was actually missing. It intentionally reads `items`/`pickQty` from the closure rather than the functional `setItems` form — see the inline comment there before "fixing" it.
- `reset` sets all items back to `max` (simulating "shift start, everything restocked") *except* items with an open, undismissed shortage — those keep their real `current` so the UI doesn't lie about deposit-side gaps. Shortages are cleared only via explicit `dismissShortage`.

`SettingsView` is where zones/products (catalog) are added/edited/removed — this mutates the `zones`/`items` arrays directly rather than going through the stock-count flow above.

`src/lib/zoneColors.js` and `src/lib/time.js` hold small shared display helpers (per-zone color coding shared between Home's donut chart and the picking list; relative-time formatting and freshness bucketing for "last updated").

`api/count-stock.js` is the only server-side code in this repo (a Vercel Serverless Function). It exists solely to hide `ANTHROPIC_API_KEY` from the client — everything else is a static SPA.

## AI zone scan ("Escanear")

From `ZoneView`, a runner can tap "📷 Escanear" (`ScanCapture`) to photograph a zone instead of counting by hand. Flow:

1. `ScanCapture` opens the phone's native camera (`<input type="file" capture="environment">`).
2. `src/lib/scan.js` resizes the photo client-side (max 1280px, JPEG q0.75) before sending it anywhere, since bar wifi is unreliable.
3. It POSTs the resized image + the zone's expected product names to `/api/count-stock`, which calls a vision-capable Claude model (via `ANTHROPIC_API_KEY`, server-side only) and gets back a count per product name.
4. Results are matched back to real item ids by exact name match (`scanZone`'s `byName` map) and handed to `ScanReview`.
5. `ScanReview` is a mandatory manual-confirmation step — the AI's counts are never applied directly. The runner adjusts each count with +/- (occlusion, miscounts, etc.) and taps "Confirmar" to actually update stock.
6. Only on confirm does `applyScanCounts(zoneId, counts)` (in `useStock`) write the adjusted counts into `items`, the same way `setFull`/`setEmpty` do.
