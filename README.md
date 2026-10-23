# Brewlab: homebrew recipe builder

Phase 2: Google sign-in and per-user storage on Supabase (Postgres with row-level security).
See [SETUP.md](SETUP.md). Without Supabase settings the app runs browser-only, as in Phase 1.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # calculation engine, storage, sync and PDF tests (vitest)
npm run test:db      # migration + row-level security tests on a throwaway Postgres
npm run build        # production build in dist/
npm run build:single # one self-contained HTML file in dist-single/
```

## What works

- Recipe builder with live OG, FG, ABV, IBU, SRM/EBC, BU:GU, efficiency, volumes, water and strike temperature.
- Fermentables, hops (boil, first wort, mash, whirlpool, dry hop), yeast (multiple strains) and other ingredients:
  search a catalog or add custom entries; edit, reorder, duplicate, remove.
- All-grain, BIAB, extract and partial mash; batch size into fermenter or post-boil kettle.
- Equipment profiles (3 defaults, create/edit/delete) copied into each recipe and editable per recipe.
- Mash and fermentation schedules, notes, BJCP 2021 style comparison with range bars.
- Metric / US units, selectable Tinseth/Rager IBU, Morey/Daniels/Mosher color, standard/alternate ABV.
- Recipe sheet view, PDF download, JSON export/import with validation, duplicate, delete with confirmation.
- Responsive (stacked ingredient rows on narrow screens), light and dark themes, keyboard-usable combobox.

## Layout

```
src/domain/   Pure calculation engine and models (no React). Canonical units: kg, g, L, °C, SG.
  units.ts gravity.ts ibu.ts color.ts volumes.ts yeast.ts recipe.ts style.ts
  __tests__/  Reference-value and edge-case tests
src/data/     Ingredient catalogs, BJCP styles, default equipment
src/store/    zod schemas, localStorage persistence, React store, factories
supabase/     SQL migration and RLS tests
src/cloud/    Supabase client, Google sign-in, sync of changes to the database
src/pdf/      jsPDF recipe sheet (loaded on demand)
src/ui/       Form controls, picker, stats panel, formatting
src/pages/    Recipe list, editor, sheet, equipment, preferences, methods
```

Formulas, assumptions and limits are documented in each domain module and on the
in-app "How calculations work" page.

## Known limitations

- Edits made on two devices at once: the last save wins for that recipe.
- No offline mode when signed in; unsaved changes retry every few seconds.
- No top-off water for partial boils; no water chemistry or mash pH yet.
- Hop form does not change utilization; dry hops add 0 IBU.
- Catalog values are typical; check package and maltster data.
- No recipe version history yet.

## Roadmap

Next: water chemistry, brew day with persistent timers, fermentation tracking, inventory,
library and BeerXML.
