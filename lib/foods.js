// Small hardcoded starter food list -- placeholder until the real USDA
// FoodData Central database is generated via usda_to_stack_nutrition.py.
// p/c/f are grams of that macro per gram of food (raw/uncooked unless noted).

export const FOODS = {
  protein: [
    { id: "chicken_breast_raw", name: "Chicken breast, raw", p: 0.23, c: 0, f: 0.026 },
    { id: "salmon_raw", name: "Salmon, raw", p: 0.20, c: 0, f: 0.13 },
    { id: "lean_ground_beef_93_raw", name: "Ground beef, 93% lean, raw", p: 0.19, c: 0, f: 0.07 },
    { id: "egg_whites", name: "Egg whites", p: 0.11, c: 0.007, f: 0 },
    { id: "whey_protein_powder", name: "Whey protein powder", p: 0.80, c: 0.08, f: 0.02 },
    { id: "shrimp_raw", name: "Shrimp, raw", p: 0.24, c: 0.002, f: 0.003 },
  ],
  carb: [
    { id: "white_rice_cooked", name: "White rice, cooked", p: 0.027, c: 0.28, f: 0.003 },
    { id: "oats_dry", name: "Oats, dry", p: 0.169, c: 0.66, f: 0.07 },
    { id: "sweet_potato_raw", name: "Sweet potato, raw", p: 0.016, c: 0.20, f: 0.001 },
    { id: "white_potato_raw", name: "White potato, raw", p: 0.02, c: 0.17, f: 0.0001 },
    { id: "banana", name: "Banana", p: 0.011, c: 0.23, f: 0.003 },
    { id: "white_bread", name: "White bread", p: 0.09, c: 0.49, f: 0.032 },
  ],
  fat: [
    { id: "olive_oil", name: "Olive oil", p: 0, c: 0, f: 1.0 },
    { id: "almonds", name: "Almonds", p: 0.21, c: 0.22, f: 0.49 },
    { id: "avocado", name: "Avocado", p: 0.02, c: 0.09, f: 0.15 },
    { id: "peanut_butter", name: "Peanut butter", p: 0.25, c: 0.20, f: 0.50 },
    { id: "butter", name: "Butter", p: 0.008, c: 0.001, f: 0.81 },
  ],
  extra: [
    { id: "broccoli_raw", name: "Broccoli, raw", p: 0.028, c: 0.066, f: 0.004 },
    { id: "spinach_raw", name: "Spinach, raw", p: 0.029, c: 0.036, f: 0.004 },
    { id: "mixed_greens", name: "Mixed greens", p: 0.014, c: 0.028, f: 0.002 },
    { id: "asparagus_raw", name: "Asparagus, raw", p: 0.022, c: 0.038, f: 0.001 },
  ],
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
