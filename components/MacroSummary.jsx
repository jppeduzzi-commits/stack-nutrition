import { MACRO_COLORS } from "@/lib/constants";

const r = Math.round;
const ROWS = [
  ["protein", "Protein", "p", "proteinG"],
  ["carb", "Carbs", "c", "carbG"],
  ["fat", "Fat", "f", "fatG"],
];

// Eaten vs. target, shared by the dashboard and the food log.
export default function MacroSummary({ totals, targets }) {
  const left = r(targets.calories) - r(totals.kcal);
  return (
    <section style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 14, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 24, fontWeight: 900 }}>
          {r(totals.kcal)}<span style={{ fontSize: 13, color: "#888", fontWeight: 700 }}> / {r(targets.calories)} cal</span>
        </div>
        {targets.calories > 0 && <div style={{ fontSize: 13, fontWeight: 800 }}>{left >= 0 ? `${left} left` : `${-left} over`}</div>}
      </div>
      {ROWS.map(([macro, name, k, tk]) => {
        const goal = Number(targets[tk]) || 0;
        const diff = r(goal) - r(totals[k]);
        return (
          <div key={macro} style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
              <span style={{ color: MACRO_COLORS[macro] }}>{name}</span>
              <span>{r(totals[k])} / {r(goal)}g {goal > 0 && <span style={{ color: "#888" }}>· {diff >= 0 ? `${diff} left` : `${-diff} over`}</span>}</span>
            </div>
            <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${goal > 0 ? Math.min(100, (totals[k] / goal) * 100) : 0}%`, background: MACRO_COLORS[macro] }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
