# Food database pipeline

Stack Nutrition's food search draws from two public-domain USDA
FoodData Central sources, bundled as a single SQLite database with
full-text search:

- **SR Legacy + Foundation Foods** (~8k generic whole foods) — kept in
  full, powers the existing hand-picked protein/carb/fat primary pickers
  (`lib/usda-foods.json`, untouched by this pipeline).
- **Branded Foods** (~1.8M real packaged/store-bought products) —
  trimmed to the most-recently-modified ~1M entries so the resulting
  database fits safely under Vercel's 250MB per-Function uncompressed
  size limit. Powers the "Extras" search only (`ExtraFoodSearch.jsx`) —
  branded foods aren't assigned a protein/carb/fat *role* the way the
  curated generic list is, since most packaged foods aren't cleanly
  "a protein source" — they're logged as a fixed-quantity extra instead,
  exactly how a nutrition label is actually used.

## The one gotcha that will bite you if you re-touch this

USDA's `food_nutrient.csv` amounts are **per 100g/100ml for every food
type**, including Branded — *not* per the food's own `serving_size`.
Verified against real Coca-Cola data (41 kcal / 11g carb per 100ml,
not per its 591ml bottle). `build_food_db.py` divides by 100 to get a
per-gram ratio directly; it does **not** divide by `serving_size`.
`serving_size`/`serving_label` are stored purely for display and to
default-fill the grams box when an extra is picked — never used in any
macro math.

## Regenerating the database

1. Download the latest bulk CSV from https://fdc.nal.usda.gov/download-datasets
   (the "Full Download of All Data Types" zip) into `data-raw/` and unzip it.
2. `rm data-raw/parsed_cache.pkl` (forces a fresh parse of the raw CSVs
   instead of reusing a stale cache).
3. `python3 scripts/build_food_db.py` — takes a few minutes, dominated by
   streaming the ~1.8GB `food_nutrient.csv`. Prints the final row count
   and file size; adjust `BRANDED_LIMIT` and re-run (cache makes repeat
   runs fast) if you need to tune the size/breadth tradeoff.
4. `node scripts/upload-food-db.mjs` (needs `BLOB_READ_WRITE_TOKEN` in
   the environment — pull it from the Vercel project's env vars) —
   uploads the new `data/foods.sqlite` to Vercel Blob at the same public
   URL `scripts/fetch-food-db.mjs` downloads from, so no code changes
   are needed afterward. Deploy as normal; the next build picks it up.

## Why Blob, not a committed file

The built database (~180MB at the current `BRANDED_LIMIT`) exceeds
GitHub's 100MB per-file push limit, so it's never committed — `data/`
and `data-raw/` are gitignored. It's fetched from Vercel Blob **only at
build time** (`scripts/fetch-food-db.mjs`, wired into `npm run build`
and `npm run dev`), never per-request, so it costs one download per
deploy rather than one per cold start — comfortably inside Blob's free
Hobby tier (1GB storage, 10GB/month transfer) even with frequent pushes.
