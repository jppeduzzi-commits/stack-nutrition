"""
Convert USDA FoodData Central bulk downloads (Foundation Foods + SR Legacy)
into a clean whole-food macro database for Stack Nutrition.

Setup:
    1. Go to https://fdc.nal.usda.gov/download-datasets
    2. Download "Foundation Foods" (JSON) -- recommended primary source,
       smaller and lab-verified, ~350 raw/minimally processed ingredients.
    3. Optionally download "SR Legacy" (JSON) -- much bigger (~7,000 items),
       older (last updated 2018), broader coverage including cooked staples,
       but noisier -- includes some prepared/mixed dishes worth hand-filtering.
    4. Unzip both, note the paths to the .json files.

Usage:
    python usda_to_stack_nutrition.py FoundationFoods.json SRLegacyFoods.json > foods.json

Output: {"protein": [...], "carb": [...], "fat": [...], "extra": []} where
each food is {"id", "name", "p", "c", "f"} with p/c/f as grams of that macro
per gram of food.

Category assignment is automatic: whichever macro contributes the most
calories (protein/carb 4 cal/g, fat 9 cal/g) becomes that food's role.
Worth a manual pass afterward -- eggs, dairy, and legumes often straddle
two roles and the heuristic will pick one.

Data source to credit in-app: U.S. Department of Agriculture, Agricultural
Research Service. FoodData Central, fdc.nal.usda.gov. (CC0 1.0)
"""

import json
import re
import sys

NUTRIENT_IDS = {"protein": 203, "fat": 204, "carb": 205}
TOP_LEVEL_KEYS = ["FoundationFoods", "SRLegacyFoods", "SurveyFoods", "BrandedFoods"]


def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return s[:40]


def extract_macros(food):
    vals = {"protein": 0.0, "fat": 0.0, "carb": 0.0}
    for fn in food.get("foodNutrients", []):
        nutrient = fn.get("nutrient") or {}
        nid = nutrient.get("id")
        amount = fn.get("amount")
        if amount is None:
            continue
        for key, target_id in NUTRIENT_IDS.items():
            if nid == target_id:
                vals[key] = amount
    return vals


def categorize(p_cal, c_cal, f_cal):
    if p_cal >= c_cal and p_cal >= f_cal:
        return "protein"
    if c_cal >= p_cal and c_cal >= f_cal:
        return "carb"
    return "fat"


def load_foods(path):
    with open(path) as fh:
        data = json.load(fh)
    if isinstance(data, list):
        return data
    for key in TOP_LEVEL_KEYS:
        if key in data:
            return data[key]
    return []


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: python usda_to_stack_nutrition.py FoundationFoods.json [SRLegacyFoods.json ...]",
            file=sys.stderr,
        )
        sys.exit(1)

    out = {"protein": [], "carb": [], "fat": [], "extra": []}
    seen_ids = set()
    skipped_no_macros = 0

    for path in sys.argv[1:]:
        foods = load_foods(path)
        for food in foods:
            fdc_id = food.get("fdcId")
            name = food.get("description")
            if not name or fdc_id in seen_ids:
                continue
            seen_ids.add(fdc_id)

            macros = extract_macros(food)
            p, c, f = macros["protein"] / 100.0, macros["carb"] / 100.0, macros["fat"] / 100.0
            if p == 0 and c == 0 and f == 0:
                skipped_no_macros += 1
                continue

            p_cal, c_cal, f_cal = p * 4, c * 4, f * 9
            category = categorize(p_cal, c_cal, f_cal)
            out[category].append(
                {
                    "id": f"{slugify(name)}_{fdc_id}",
                    "name": name,
                    "p": round(p, 4),
                    "c": round(c, 4),
                    "f": round(f, 4),
                }
            )

    for cat in ["protein", "carb", "fat"]:
        out[cat].sort(key=lambda x: x["name"])

    json.dump(out, sys.stdout, indent=2)
    counts = {k: len(v) for k, v in out.items()}
    print(
        f"\nParsed {sum(counts.values())} foods ({counts}), skipped {skipped_no_macros} with no macro data.",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
