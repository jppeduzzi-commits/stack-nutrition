// Pure helpers for the food log. Logged items carry their own name and
// macros-per-gram, so later edits to a meal or the food data never change history.

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function shiftKey(key, days) {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function formatKey(key, today = dateKey()) {
  if (key === today) return "Today";
  if (key === shiftKey(today, -1)) return "Yesterday";
  return parseKey(key).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export const newId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function makeItem(food, grams) {
  return {
    id: newId("item"),
    foodId: String(food.id ?? ""),
    name: food.name,
    grams: Math.round(Number(grams) * 10) / 10,
    p: Number(food.p) || 0,
    c: Number(food.c) || 0,
    f: Number(food.f) || 0,
  };
}

// Turns a solved meal into log items; null if it has no trustworthy solution.
export function itemsFromMeal(meal, result, foodLookup) {
  if (!result || result.error || result.infeasible) return null;
  const items = [];
  for (const role of ["protein", "carb", "fat"]) {
    const grams = result[`${role}FoodGrams`];
    if (grams >= 0.05) items.push(makeItem(foodLookup[meal[`${role}Food`]], grams));
  }
  for (const e of meal.extras || []) {
    const local = foodLookup[e.food];
    const food = e.p != null ? { id: e.food, name: e.name || local?.name || "Food", p: e.p, c: e.c, f: e.f } : local;
    if (food && Number(e.grams) > 0) items.push(makeItem(food, e.grams));
  }
  return items;
}

export function sumItems(items) {
  const t = { p: 0, c: 0, f: 0 };
  for (const i of items || []) {
    const g = Number(i.grams) || 0;
    t.p += i.p * g;
    t.c += i.c * g;
    t.f += i.f * g;
  }
  return { ...t, kcal: t.p * 4 + t.c * 4 + t.f * 9 };
}

export const dayEntries = (day) =>
  Object.values(day?.entries || {}).sort((a, b) => a.loggedAt - b.loggedAt);

export const dayTotals = (day) => sumItems(dayEntries(day).flatMap((e) => e.items));
