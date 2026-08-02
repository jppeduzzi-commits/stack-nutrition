// Real whole-food macro database, generated from USDA FoodData Central
// Foundation Foods (CC0 public domain) via usda_to_stack_nutrition.py.
// p/c/f are grams of that macro per gram of food.
//
// Foundation Foods has no pure-fat or protein-powder entries (oils and
// supplements aren't "foundation" ingredients), so a couple of packaged
// exceptions are added by hand per the spec's whey-protein-powder allowance.

import usdaFoods from "./usda-foods.json";

const PACKAGED_EXCEPTIONS = {
  protein: [{ id: "whey_protein_powder", name: "Whey protein powder", p: 0.8, c: 0.08, f: 0.02 }],
  carb: [],
  fat: [{ id: "olive_oil", name: "Olive oil", p: 0, c: 0, f: 1.0 }],
  extra: [],
};

export const FOODS = {
  protein: [...PACKAGED_EXCEPTIONS.protein, ...usdaFoods.protein],
  carb: [...PACKAGED_EXCEPTIONS.carb, ...usdaFoods.carb],
  fat: [...PACKAGED_EXCEPTIONS.fat, ...usdaFoods.fat],
  extra: [...PACKAGED_EXCEPTIONS.extra, ...usdaFoods.extra],
};

export const FOOD_LOOKUP = Object.fromEntries(
  Object.values(FOODS).flat().map((f) => [f.id, f])
);

export function foodRole(id) {
  for (const [role, list] of Object.entries(FOODS)) {
    if (list.some((f) => f.id === id)) return role;
  }
  return null;
}
