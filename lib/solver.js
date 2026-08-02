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

// meal: { pctOfDay, proteinFood, carbFood, fatFood, extras: [{ food, grams }] }
// foods are { p, c, f } grams of macro per gram of food.
// dailyTargets: result of computeDailyTargets().
//
// Extras are fixed-quantity (user sets grams by hand) and are subtracted
// from the meal's target before solving for the three primaries -- the
// primaries are the only unknowns the solver ever touches.

export function solveMeal(meal, dailyTargets, foodLookup) {
  const mealP = (dailyTargets.proteinG * meal.pctOfDay) / 100;
  const mealC = (dailyTargets.carbG * meal.pctOfDay) / 100;
  const mealF = (dailyTargets.fatG * meal.pctOfDay) / 100;

  let extraP = 0, extraC = 0, extraF = 0;
  for (const e of meal.extras || []) {
    const food = foodLookup[e.food];
    if (!food) continue;
    extraP += food.p * e.grams;
    extraC += food.c * e.grams;
    extraF += food.f * e.grams;
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
