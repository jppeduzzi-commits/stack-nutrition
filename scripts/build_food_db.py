#!/usr/bin/env python3
"""
Builds a self-contained SQLite food database (with FTS5 search) from the
USDA FoodData Central bulk CSV download, for Stack Nutrition.

Sources (all public domain, free): SR Legacy + Foundation Foods (generic
foods, ~8k items, full coverage) and a quality-filtered slice of Branded
Foods (~2M raw rows -- trimmed down to fit Vercel's 250MB per-function
uncompressed size limit, since the whole point is this ships inside a
serverless function with no new paid service).

Run from the stack-nutrition repo root:
    python3 scripts/build_food_db.py
"""
import csv
import pickle
import sqlite3
import os
import sys

csv.field_size_limit(sys.maxsize)

RAW = os.path.join(os.path.dirname(__file__), "..", "data-raw", "FoodData_Central_csv_2026-10-29")
OUT_DB = os.path.join(os.path.dirname(__file__), "..", "data", "foods.sqlite")
CACHE = os.path.join(os.path.dirname(__file__), "..", "data-raw", "parsed_cache.pkl")

NUTRIENT_IDS = {"1008": "calories", "1003": "protein", "1004": "fat", "1005": "carbs"}

# Cap on how many branded foods to keep, to stay well under the 250MB
# Vercel Function limit once bundled. Prioritized by data completeness/
# recency below, not just first-N, so the kept slice is the "best" one.
BRANDED_LIMIT = 1_000_000


def load_nutrients():
    print("Pass 1/4: scanning food_nutrient.csv for calories/protein/fat/carbs ...")
    by_food = {}
    path = os.path.join(RAW, "food_nutrient.csv")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # header
        n = 0
        for row in reader:
            n += 1
            if n % 5_000_000 == 0:
                print(f"  ... {n:,} rows scanned, {len(by_food):,} foods with a macro so far")
            nutrient_id = row[2]
            key = NUTRIENT_IDS.get(nutrient_id)
            if not key:
                continue
            fdc_id = row[1]
            amount = row[3]
            if not amount:
                continue
            try:
                amount = float(amount)
            except ValueError:
                continue
            by_food.setdefault(fdc_id, {})[key] = amount
    print(f"  done: {n:,} rows scanned, {len(by_food):,} foods have at least one macro")
    return by_food


def load_food_types():
    print("Pass 2/4: scanning food.csv for descriptions + data_type ...")
    foods = {}  # fdc_id -> (data_type, description)
    path = os.path.join(RAW, "food.csv")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            fdc_id, data_type, description = row[0], row[1], row[2]
            foods[fdc_id] = (data_type, description)
    print(f"  done: {len(foods):,} total foods of all types")
    return foods


def load_branded_fields():
    print("Pass 3/4: scanning branded_food.csv for brand/serving fields ...")
    branded = {}  # fdc_id -> dict of fields
    path = os.path.join(RAW, "branded_food.csv")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        n = 0
        for row in reader:
            n += 1
            if n % 500_000 == 0:
                print(f"  ... {n:,} branded rows scanned")
            if row.get("discontinued_date"):
                continue
            branded[row["fdc_id"]] = {
                "brand_owner": row.get("brand_owner") or "",
                "brand_name": row.get("brand_name") or "",
                "serving_size": row.get("serving_size") or "",
                "serving_size_unit": row.get("serving_size_unit") or "",
                "household_serving": row.get("household_serving_fulltext") or "",
                "market_country": row.get("market_country") or "",
                "modified_date": row.get("modified_date") or "",
            }
    print(f"  done: {len(branded):,} non-discontinued branded foods")
    return branded


def build():
    os.makedirs(os.path.dirname(OUT_DB), exist_ok=True)
    if os.path.exists(OUT_DB):
        os.remove(OUT_DB)

    if os.path.exists(CACHE):
        print(f"Using cached parse from {CACHE} (delete it to re-parse the raw CSVs)")
        with open(CACHE, "rb") as f:
            nutrients, foods, branded_fields = pickle.load(f)
    else:
        nutrients = load_nutrients()
        foods = load_food_types()
        branded_fields = load_branded_fields()
        with open(CACHE, "wb") as f:
            pickle.dump((nutrients, foods, branded_fields), f, protocol=pickle.HIGHEST_PROTOCOL)

    print("Pass 4/4: joining + filtering + writing SQLite ...")
    conn = sqlite3.connect(OUT_DB)
    conn.execute("""
        CREATE TABLE foods (
            fdc_id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,          -- 'generic' or 'branded'
            name TEXT NOT NULL,
            brand TEXT,
            serving_size_g REAL,         -- best-effort grams for one serving (display/default-fill only)
            serving_label TEXT,          -- e.g. "20 fl oz" / "1 Bottle" -- shown as-is, never used in math
            p REAL, c REAL, f REAL, kcal REAL   -- grams of macro (kcal for energy) PER GRAM of food
        )
    """)

    # USDA's food_nutrient amounts are per 100 g/ml for every data type here
    # (verified against real Coca-Cola data: 41 kcal / 11g carb per 100ml,
    # not per its 591ml serving_size) -- so the per-gram ratio is just
    # amount/100 regardless of what unit the *serving size* happens to be
    # in. Serving size/unit are stored purely for display and to default-fill
    # the "how many grams" box when an extra is picked -- never for the ratio.
    GRAM_UNITS = {"g", "grm", "gm"}
    ML_UNITS = {"ml", "mlt"}  # treated as ~1g/ml, standard nutrition-app approximation

    generic_rows = []
    branded_candidates = []  # collected, then trimmed to BRANDED_LIMIT by completeness/recency

    for fdc_id, (data_type, description) in foods.items():
        macros = nutrients.get(fdc_id)
        if not macros or "calories" not in macros or "protein" not in macros or "fat" not in macros or "carbs" not in macros:
            continue  # need all 4 macros to be useful to the solver

        if data_type in ("sr_legacy_food", "foundation_food"):
            generic_rows.append((
                fdc_id, "generic", description, None, 100.0, None,
                macros["protein"] / 100, macros["carbs"] / 100, macros["fat"] / 100, macros["calories"] / 100,
            ))
        elif data_type == "branded_food":
            bf = branded_fields.get(fdc_id)
            if not bf:
                continue  # discontinued or missing branded_food row
            if bf["market_country"] and bf["market_country"] != "United States":
                continue  # keep this slice US-focused, where the app's users are
            unit = (bf["serving_size_unit"] or "").strip().lower()
            try:
                raw_size = float(bf["serving_size"]) if bf["serving_size"] else None
            except ValueError:
                raw_size = None
            serving_size_g = raw_size if raw_size and (unit in GRAM_UNITS or unit in ML_UNITS) else None
            serving_label = bf["household_serving"] or (f"{bf['serving_size']} {bf['serving_size_unit']}".strip() if bf["serving_size"] else None)
            branded_candidates.append((
                fdc_id, bf, description, serving_size_g, serving_label, macros, bf["modified_date"],
            ))

    print(f"  {len(generic_rows):,} generic foods kept (all of them)")
    print(f"  {len(branded_candidates):,} branded candidates before trimming to {BRANDED_LIMIT:,}")

    # Prioritize the most recently modified entries -- a reasonable proxy for
    # "currently on shelves" over older/superseded label submissions.
    branded_candidates.sort(key=lambda c: c[6] or "", reverse=True)
    branded_candidates = branded_candidates[:BRANDED_LIMIT]

    branded_rows = []
    for fdc_id, bf, name, serving_size_g, serving_label, macros, _modified in branded_candidates:
        branded_rows.append((
            fdc_id, "branded", name, bf["brand_name"] or bf["brand_owner"] or None,
            serving_size_g, serving_label,
            macros["protein"] / 100, macros["carbs"] / 100, macros["fat"] / 100, macros["calories"] / 100,
        ))

    conn.executemany(
        "INSERT INTO foods VALUES (?,?,?,?,?,?,?,?,?,?)",
        generic_rows + branded_rows,
    )

    conn.execute("""
        CREATE VIRTUAL TABLE foods_fts USING fts5(
            name, brand, content='foods', content_rowid='rowid'
        )
    """)
    conn.execute("""
        INSERT INTO foods_fts(rowid, name, brand)
        SELECT rowid, name, brand FROM foods
    """)

    conn.commit()
    print(f"  wrote {len(generic_rows) + len(branded_rows):,} total foods")
    conn.execute("VACUUM")
    conn.close()

    size_mb = os.path.getsize(OUT_DB) / (1024 * 1024)
    print(f"\nDone: {OUT_DB} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    build()
