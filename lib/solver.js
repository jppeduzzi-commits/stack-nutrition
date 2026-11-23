// Stack Nutrition -- core solver logic, ported from prototype_logic.js.
//
// A meal has three primary food slots (protein, carb, fat). Because real
// foods carry more than one macro, the exact gram amount of each of the
// three foods needed to hit a meal's target is the solution to a 3x3
// linear system, solved here via Cramer's rule.

export function computeDailyTargets({ calories, lbm, proteinRatioPerLbLbm, fatPctOfCalories }) {
  const proteinG = proteinRatioPerLbLbm * lbm;
  const fatG = (fatPctOfCalories / 100 * calories) / 9;
  const carbCal = calories - proteinG * 4 - fatG * 9;
  const carbG = Math.max(carbCal, 0) / 4;
  return { calories, proteinG, fatG, carbG };
}

// Spreads meals evenly across a typical waking day so "closeness to training
// time" has something to measure against, without asking the user to set a
// clock time on every single meal.
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;

export function estimateMealHour(index, count, startHour = DAY_START_HOUR, endHour = DAY_END_HOUR) {
  if (!count || count <= 0) return startHour;
  const span = endHour - startHour;
  return startHour + ((index + 0.5) * span) / count;
}

export function formatHour(hour) {
  const h24 = ((Math.round(hour * 2) / 2) % 24 + 24) % 24;
  const h = Math.floor(h24);
  const mins = Math.round((h24 - h) * 60);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mins).padStart(2, "0")} ${period}`;
}

export function parseHourFromTimeString(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (!Number.isFinite(h)) return DAY_START_HOUR;
  return h + (Number.isFinite(m) ? m : 0) / 60;
}

function circularHourDiff(a, b) {
  const d = Math.abs(a - b) % 24;
  return d > 12 ? 24 - d : d;
}

// How much a meal's carbs should be weighted toward training time: 1.0 right
// at training time, decaying to a floor of 0.3 by `window` hours away (never
// zero -- a meal far from training still gets some carbs).
function carbWeightForMeal(mealHour, trainingHour, window = 4) {
  const diff = circularHourDiff(mealHour, trainingHour);
  const closeness = Math.max(0, 1 - diff / window);
  return 0.3 + 0.7 * closeness;
}

// Per-meal protein/carb/fat targets in grams, given how the day is divided
// among meals (meal.pctOfDay). Protein and total calories per meal always
// follow pctOfDay. Carbs and fat only follow pctOfDay in "even" mode --
// in "shift" mode carbs reweight toward meals closest to training time and
// fat is derived from what's left, so carbs/fat trade off against each
// other within a meal's fixed calorie budget without touching protein or
// the day's overall totals.
export function computeMealTargets(meals, dailyTargets, { trainingTime, carbTiming } = {}) {
  const n = meals.length;
  const pct = meals.map((m) => Number(m.pctOfDay) || 0);

  let carbShare = pct.map((p) => p / 100);
  if (carbTiming === "shift" && trainingTime) {
    const trainingHour = parseHourFromTimeString(trainingTime);
    const weights = meals.map(
      (_, i) => (pct[i] / 100) * carbWeightForMeal(estimateMealHour(i, n), trainingHour)
    );
    const weightSum = weights.reduce((a, b) => a + b, 0);
    carbShare = weightSum > 0 ? weights.map((w) => w / weightSum) : pct.map((p) => p / 100);
  }

  return meals.map((m, i) => {
    const mealCalories = (dailyTargets.calories * pct[i]) / 100;
    const mealP = (dailyTargets.proteinG * pct[i]) / 100;
    const remainingCal = mealCalories - mealP * 4;
    const mealC = dailyTargets.carbG * carbShare[i];
    const mealF = Math.max(0, (remainingCal - mealC * 4) / 9);
    return { mealP, mealC, mealF };
  });
}

// M is a 3x3 matrix: [[p1,p2,p3],[c1,c2,c3],[f1,f2,f3]]
// where each column is one food's [protein, carb, fat] grams per gram of
// that food, and T is the target vector [P, C, F] in grams.
// Returns [x1, x2, x3] (grams of each food) or null if the system is
// singular (no unique solution -- e.g. two chosen foods have identical
// macro ratios).

function determinant3x3(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function replaceColumn(m, col, vec) {
  return m.map((row, i) => row.map((val, j) => (j === col ? vec[i] : val)));
}

export function solve3x3(M, T) {
  const D = determinant3x3(M);
  if (Math.abs(D) < 1e-9) return null;
  const x1 = determinant3x3(replaceColumn(M, 0, T)) / D;
  const x2 = determinant3x3(replaceColumn(M, 1, T)) / D;
  const x3 = determinant3x3(replaceColumn(M, 2, T)) / D;
  return [x1, x2, x3];
}

// meal: { pctOfDay, proteinFood, carbFood, fatFood, extras: [{ food, grams, section }] }
// foods are { p, c, f } grams of macro per gram of food.
// dailyTargets: result of computeDailyTargets() -- used directly only when
// mealTargetsOverride is omitted; pass the matching entry from
// computeMealTargets() as the override once carb/fat timing is in play.
//
// Extras are fixed-quantity (user sets grams by hand) and are subtracted
// from the meal's target before solving for the three primaries -- the
// primaries are the only unknowns the solver ever touches. `section` just
// tags which macro column an extra is grouped under in the UI; it has no
// effect on the math here.

export function solveMeal(meal, dailyTargets, foodLookup, mealTargetsOverride) {
  const mealP = mealTargetsOverride ? mealTargetsOverride.mealP : (dailyTargets.proteinG * meal.pctOfDay) / 100;
  const mealC = mealTargetsOverride ? mealTargetsOverride.mealC : (dailyTargets.carbG * meal.pctOfDay) / 100;
  const mealF = mealTargetsOverride ? mealTargetsOverride.mealF : (dailyTargets.fatG * meal.pctOfDay) / 100;

  let extraP = 0, extraC = 0, extraF = 0;
  for (const e of meal.extras || []) {
    // Branded/packaged foods (picked from the USDA database search) carry
    // their own p/c/f directly on the extra, since they aren't in the local
    // foodLookup table -- prefer that over a lookup when present.
    const food = e.p != null ? e : foodLookup[e.food];
    if (!food) continue;
    const grams = Number(e.grams) || 0;
    extraP += food.p * grams;
    extraC += food.c * grams;
    extraF += food.f * grams;
  }

  const pf = foodLookup[meal.proteinFood];
  const cf = foodLookup[meal.carbFood];
  const ff = foodLookup[meal.fatFood];
  if (!pf || !cf || !ff) return { error: "missing_food" };

  const M = [
    [pf.p, cf.p, ff.p],
    [pf.c, cf.c, ff.c],
    [pf.f, cf.f, ff.f],
  ];
  const T = [mealP - extraP, mealC - extraC, mealF - extraF];

  const sol = solve3x3(M, T);
  if (!sol) return { error: "singular", mealP, mealC, mealF };

  const [proteinFoodGrams, carbFoodGrams, fatFoodGrams] = sol;
  const infeasible = proteinFoodGrams < -0.5 || carbFoodGrams < -0.5 || fatFoodGrams < -0.5;

  return {
    proteinFoodGrams: Math.max(proteinFoodGrams, 0),
    carbFoodGrams: Math.max(carbFoodGrams, 0),
    fatFoodGrams: Math.max(fatFoodGrams, 0),
    rawSolution: sol,
    infeasible,
    mealP,
    mealC,
    mealF,
    extraP,
    extraC,
    extraF,
  };
}
