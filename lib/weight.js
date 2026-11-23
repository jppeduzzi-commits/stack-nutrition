import { shiftKey } from "./log";

// weights: { [date]: pounds }. Returns the average of the weigh-ins in the 7
// days ending on `end`, or null if there were none.
export function weekAverage(weights, end) {
  const vals = [];
  for (let i = 0; i < 7; i++) {
    const v = weights[shiftKey(end, -i)];
    if (v > 0) vals.push(v);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

// Average for the week ending `end`, and how it moved from the week before.
export function weightTrend(weights, end) {
  const avg = weekAverage(weights, end);
  const prev = weekAverage(weights, shiftKey(end, -7));
  return { avg, change: avg !== null && prev !== null ? avg - prev : null };
}

export const fmtLb = (n) => (Math.round(n * 10) / 10).toFixed(1);
export const fmtChange = (n) => {
  const v = Math.round(n * 10) / 10;
  return v === 0 ? "no change" : `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} lb`;
};
