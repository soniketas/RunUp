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

Persistence is plain `localStorage`, one key per state slice (`STORAGE_KEY_*` constants in `src/data/initialData.js`), each written via its own `useEffect` in `useStock`. There is no backend/API layer. When adding a new piece of persisted state, follow the existing pattern: a `loadX()` function with try/catch fallback to a default, a `useState(loadX)` initializer, and a `useEffect` that writes it back on change.

Key data flow through `useStock`:
- `items` (flat array, each with `zoneId`) + `zones` are the two persisted entities. `itemsByZone` is a derived `Map` grouping items by zone.
- `pickQty` (object `{ [itemId]: qty }`) tracks how much of each missing item has been confirmed as "gathered from the deposit" during an active picking session — it is *not* the same as "fully restocked" when the deposit falls short.
- `pickingByZone` derives the picking-list UI grouping from `itemsByZone` + `pickQty`, only including items where `current < max`.
- `finalizeChecked` applies `pickQty` onto `items` (increasing `current`, capped at `max`), and appends to `shortages` for any item where the confirmed quantity was less than what was actually missing. It intentionally reads `items`/`pickQty` from the closure rather than the functional `setItems` form — see the inline comment there before "fixing" it.
- `reset` sets all items back to `max` (simulating "shift start, everything restocked") *except* items with an open, undismissed shortage — those keep their real `current` so the UI doesn't lie about deposit-side gaps. Shortages are cleared only via explicit `dismissShortage`.

`SettingsView` is where zones/products (catalog) are added/edited/removed — this mutates the `zones`/`items` arrays directly rather than going through the stock-count flow above.

`src/lib/zoneColors.js` and `src/lib/time.js` hold small shared display helpers (per-zone color coding shared between Home's donut chart and the picking list; relative-time formatting and freshness bucketing for "last updated").
