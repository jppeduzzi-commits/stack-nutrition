// Meal names, times and how the day is divided between meals.

export const MEAL_NAMES = [
  "Breakfast", "Brunch", "Lunch", "Dinner", "Pre Workout", "Post Workout",
  ...Array.from({ length: 8 }, (_, i) => `Meal ${i + 1}`),
];
export const MAX_MEALS = 8;

const num = (v) => Number(v) || 0;
export const pctSum = (meals) => meals.reduce((s, m) => s + num(m.pctOfDay), 0);

// Splits `total` across n meals in whole numbers that add up exactly
// (leftovers go to the first meals).
export function evenSplit(total, n) {
  const base = Math.floor(total / n);
  let left = total - base * n;
  return Array.from({ length: n }, () => {
    const extra = Math.min(1, Math.max(0, left));
    left -= extra;
    return base + extra;
  });
}

// Locked meals keep their share; the rest divide what's left evenly.
export function rebalance(meals) {
  const open = meals.filter((m) => !m.locked);
  if (!open.length) return meals;
  const shares = evenSplit(Math.max(0, 100 - pctSum(meals.filter((m) => m.locked))), open.length);
  let i = 0;
  return meals.map((m) => (m.locked ? m : { ...m, pctOfDay: shares[i++] }));
}

// Setting a share by hand locks it. It can't take more than the other locked meals leave.
export function setPct(meals, id, value) {
  const room = Math.max(0, 100 - pctSum(meals.filter((m) => m.locked && m.id !== id)));
  const pctOfDay = Math.min(room, Math.max(0, Math.round(num(value))));
  return rebalance(meals.map((m) => (m.id === id ? { ...m, pctOfDay, locked: true } : m)));
}

export const toggleLock = (meals, id) =>
  rebalance(meals.map((m) => (m.id === id ? { ...m, locked: !m.locked } : m)));

export const sortMeals = (meals) =>
  [...meals].sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id, "en", { numeric: true }));

const toTime = (hour) => {
  const half = Math.round(hour * 2);
  return `${String(Math.floor(half / 2)).padStart(2, "0")}:${half % 2 ? "30" : "00"}`;
};

// Fills in time/locked on meals saved before those existed. A hand-set split
// is locked so it isn't overwritten by the automatic one.
export function upgradeMeals(meals) {
  const n = meals.length;
  const even = evenSplit(100, n);
  const custom = meals.some((m, i) => num(m.pctOfDay) !== even[i]);
  return sortMeals(
    meals.map((m, i) => ({
      ...m,
      time: m.time || toTime(7 + ((i + 0.5) * 14) / n),
      locked: m.locked ?? custom,
    }))
  );
}

const blank = (i, name, time) => ({
  id: `meal_${Date.now()}_${i}`, name, time, locked: false, pctOfDay: 0, proteinFood: "", carbFood: "", fatFood: "", extras: [],
});

export const defaultMeals = () =>
  rebalance([["Breakfast", "08:00"], ["Lunch", "12:30"], ["Dinner", "18:30"]].map(([n, t], i) => blank(i, n, t)));

export function addMeal(meals) {
  const name = [`Meal ${meals.length + 1}`, ...MEAL_NAMES.slice(6)].find((n) => !meals.some((m) => m.name === n)) || "Meal 1";
  const last = meals[meals.length - 1]?.time || "06:00";
  const hour = Math.min(23, Number(last.slice(0, 2)) + 2);
  return rebalance(sortMeals([...meals, blank(meals.length, name, `${String(hour).padStart(2, "0")}:${last.slice(3)}`)]));
}

export const removeMeal = (meals, id) => rebalance(meals.filter((m) => m.id !== id));

export const hasFoods = (m) => !!(m.proteinFood || m.carbFood || m.fatFood || m.extras?.length);

export function formatTime(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (!Number.isFinite(h)) return "";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
