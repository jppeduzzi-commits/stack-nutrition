// Weekly recap: were the goals met?
import { dayEntries, dayTotals, parseKey, shiftKey } from "./log";

export const TOLERANCE = 0.1;

export const GOALS = [
  { key: "kcal", name: "Calories", target: "calories", unit: "" },
  { key: "p", name: "Protein", target: "proteinG", unit: "g", floor: true },
  { key: "c", name: "Carbs", target: "carbG", unit: "g" },
  { key: "f", name: "Fat", target: "fatG", unit: "g" },
];

// Within 10% of target; protein only has to reach 90%, going over is fine.
export function goalMet(goal, actual, target) {
  if (!(target > 0)) return null;
  const ratio = actual / target;
  return ratio >= 1 - TOLERANCE - 1e-9 && (goal.floor || ratio <= 1 + TOLERANCE + 1e-9);
}

// Weeks run Monday to Sunday.
export const weekStart = (key) => shiftKey(key, -((parseKey(key).getDay() + 6) % 7));

// Today is still in progress and unlogged days say nothing about what was
// eaten, so neither counts toward the results.
export function weekRecap(days, start, today) {
  const list = Array.from({ length: 7 }, (_, i) => {
    const date = shiftKey(start, i);
    const day = days[date];
    const logged = dayEntries(day).length > 0;
    const totals = dayTotals(day);
    const targets = day?.targets || {};
    const counts = logged && date < today && targets.calories > 0;
    const status = date > today ? "future" : date === today ? "today" : !logged ? "missed" : !counts ? "notarget" : goalMet(GOALS[0], totals.kcal, targets.calories) ? "met" : "off";
    return { date, totals, targets, counts, status };
  });
  const counted = list.filter((d) => d.counts);
  const n = counted.length;
  const goals = GOALS.map((g) => {
    const withGoal = counted.filter((d) => d.targets[g.target] > 0);
    const avg = (f) => (withGoal.length ? withGoal.reduce((s, d) => s + f(d), 0) / withGoal.length : 0);
    const actual = avg((d) => d.totals[g.key]);
    const target = avg((d) => d.targets[g.target]);
    return {
      ...g, actual, goal: target,
      met: goalMet(g, actual, target),
      daysMet: withGoal.filter((d) => goalMet(g, d.totals[g.key], d.targets[g.target])).length,
      daysCounted: withGoal.length,
    };
  });
  const scored = goals.filter((g) => g.met !== null);
  return { start, end: shiftKey(start, 6), days: list, counted: n, goals, goalsMet: scored.filter((g) => g.met).length, goalsTotal: scored.length, finished: shiftKey(start, 6) < today };
}
