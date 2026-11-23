"use client";

import { useState } from "react";
import { MAX_MEALS, MEAL_NAMES, pctSum } from "@/lib/meals";
import MacroBadge from "./MacroBadge";

const card = {
  background: "#fff",
  border: "1.5px solid #e8e8e8",
  borderRadius: 14,
  padding: 14,
};

const sectionLabel = {
  fontSize: 10,
  fontWeight: 800,
  color: "#bbb",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const inputStyle = {
  border: "1.5px solid #e8e8e8",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 16, // below 16 iOS zooms the page on focus
  fontWeight: 700,
  color: "#0a0a0a",
  outline: "none",
  background: "#fff",
};


const CARB_TIMING_OPTIONS = [
  { key: "even", label: "Even split" },
  { key: "shift", label: "Near workout" },
];

// Everything you set up once (and glance at, rarely edit) lives on this one
// dense page -- daily macro targets, meal count, each meal's % of day, and
// carb/fat timing -- so there's no horizontal overflow or pinch-zooming to
// find a control. Food logging itself lives on the other tab.
export default function StrategyPage({
  inputs,
  targets,
  onRecalc,
  onEditTargets,
  meals,
  onAddMeal,
  onRemoveLastMeal,
  onSelect,
  onMealPatch,
  onSetPct,
  onToggleLock,
  onSortMeals,
  trainingTime,
  onTrainingTimeChange,
  carbTiming,
  onCarbTimingChange,
}) {
  const [draft, setDraft] = useState(inputs);
  const [adjustOpen, setAdjustOpen] = useState(!targets.calories); // open until targets are set

  const setField = (key) => (e) => {
    const raw = e.target.value;
    setDraft((d) => ({ ...d, [key]: raw === "" ? "" : Number(raw) }));
  };

  const setTargetField = (key) => (e) => {
    const raw = e.target.value;
    const next = { ...targets, [key]: raw === "" ? 0 : Number(raw) };
    // Macros typed straight in with no calorie goal: calories follow the macros.
    if (!inputs.calories) next.calories = next.proteinG * 4 + next.carbG * 4 + next.fatG * 9;
    onEditTargets(next);
  };

  const fmt = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : "—");
  const pctTotal = pctSum(meals);
  const pctOk = Math.abs(pctTotal - 100) < 0.05;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div style={sectionLabel}>Daily targets</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0a0a0a" }}>{Math.round(targets.calories)} kcal</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <MacroStat macro="protein" value={targets.proteinG} onChange={setTargetField("proteinG")} />
          <MacroStat macro="carb" value={targets.carbG} onChange={setTargetField("carbG")} />
          <MacroStat macro="fat" value={targets.fatG} onChange={setTargetField("fatG")} />
        </div>

        <button
          onClick={() => setAdjustOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            marginTop: 10,
            fontSize: 11,
            fontWeight: 800,
            color: "#888",
            cursor: "pointer",
          }}
        >
          {adjustOpen ? "Hide inputs ▲" : "Adjust inputs ▾"}
        </button>

        {adjustOpen && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 8, marginTop: 10 }}>
              <MiniField label="Body wt (lb)" value={draft.bodyWeight} onChange={setField("bodyWeight")} />
              <MiniField label="LBM (lb)" value={draft.lbm} onChange={setField("lbm")} />
              <MiniField label="Protein (g/lb)" value={draft.proteinRatio} onChange={setField("proteinRatio")} step="0.1" />
              <MiniField label="Fat (% cal)" value={draft.fatPct} onChange={setField("fatPct")} />
              <MiniField label="Calories" value={draft.calories} onChange={setField("calories")} />
            </div>
            <button
              onClick={() => onRecalc(draft)}
              style={{
                marginTop: 10,
                background: "#0a0a0a",
                color: "#fff",
                border: "none",
                borderRadius: 16,
                padding: "7px 16px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Recalculate
            </button>
          </>
        )}
      </section>

      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={sectionLabel}>Meals per day</div>
          <Stepper value={meals.length} min={1} max={MAX_MEALS} onChange={(n) => (n > meals.length ? onAddMeal() : onRemoveLastMeal())} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {meals.map((m) => (
            <MealRow
              key={m.id}
              meal={m}
              taken={meals.filter((x) => x.id !== m.id).map((x) => x.name)}
              onSelect={() => onSelect(m.id)}
              onPatch={(patch) => onMealPatch(m.id, patch)}
              onSetPct={(v) => onSetPct(m.id, v)}
              onToggleLock={() => onToggleLock(m.id)}
              onSort={onSortMeals}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: pctOk ? "#10B981" : "#E4574C" }}>
            {fmt(pctTotal)}% of day {pctOk ? "✓" : "(unlock a meal to reach 100%)"}
          </div>
        </div>
      </section>

      <section style={card}>
        <div style={{ ...sectionLabel, marginBottom: 8 }}>Carb &amp; fat timing</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#888", marginBottom: 3 }}>Training time</div>
            <input
              type="time"
              value={trainingTime}
              onChange={(e) => onTrainingTimeChange(e.target.value)}
              style={{ ...inputStyle, width: 124 }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {CARB_TIMING_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onCarbTimingChange(opt.key)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 16,
                  border: `1.5px solid ${carbTiming === opt.key ? "#0a0a0a" : "#e8e8e8"}`,
                  background: carbTiming === opt.key ? "#0a0a0a" : "#fff",
                  color: carbTiming === opt.key ? "#fff" : "#0a0a0a",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#bbb", marginTop: 8, lineHeight: 1.4 }}>
          {carbTiming === "shift"
            ? "Carbs shift toward meals closest to training time; fat shifts toward meals farther away. Calories and protein per meal don't change."
            : "Carbs and fat split evenly across meals in proportion to each meal's % of day."}
        </div>
      </section>
    </div>
  );
}

function MacroStat({ macro, value, onChange }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 4 }}>
        <MacroBadge macro={macro} />
      </div>
      <input type="number" step="0.1" value={Math.round(value * 10) / 10} onChange={onChange} onFocus={(e) => e.target.select()} style={{ ...inputStyle, width: "100%" }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: "#bbb", marginTop: 2 }}>g/day</div>
    </div>
  );
}

function MiniField({ label, value, onChange, step }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#888", marginBottom: 3 }}>{label}</div>
      <input type="number" step={step ?? "1"} value={value} onChange={onChange} onFocus={(e) => e.target.select()} style={{ ...inputStyle, width: "100%" }} />
    </div>
  );
}

function Stepper({ value, min, max, onChange }) {
  const atMin = value <= min;
  const atMax = value >= max;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={atMin} style={stepBtnStyle(atMin)}>
        &minus;
      </button>
      <div style={{ fontSize: 16, fontWeight: 900, width: 16, textAlign: "center" }}>{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={atMax} style={stepBtnStyle(atMax)}>
        +
      </button>
    </div>
  );
}

function stepBtnStyle(disabled) {
  return {
    width: 26,
    height: 26,
    borderRadius: 8,
    border: "1.5px solid #e8e8e8",
    background: disabled ? "#f5f5f5" : "#fff",
    color: disabled ? "#ddd" : "#0a0a0a",
    fontSize: 15,
    fontWeight: 800,
    cursor: disabled ? "default" : "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
  };
}

// Time edits save as they're made; the list only re-sorts after leaving the
// field, so the row doesn't jump while it's being edited.
function MealRow({ meal, taken, onSelect, onPatch, onSetPct, onToggleLock, onSort }) {
  const names = MEAL_NAMES.includes(meal.name) ? MEAL_NAMES : [meal.name, ...MEAL_NAMES];
  return (
    <div style={{ padding: 8, borderRadius: 10, border: "1.5px solid #e8e8e8", background: "#fafafa" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <select value={meal.name} aria-label="Meal name" onChange={(e) => onPatch({ name: e.target.value })} style={{ ...inputStyle, flex: 1, minWidth: 0 }}>
          {names.map((n) => (
            <option key={n} value={n} disabled={taken.includes(n)}>{n}</option>
          ))}
        </select>
        <input type="time" value={meal.time} aria-label={`${meal.name} time`} onChange={(e) => e.target.value && onPatch({ time: e.target.value })} onBlur={onSort} style={{ ...inputStyle, width: 124 }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        <PctField key={meal.pctOfDay} value={meal.pctOfDay} name={meal.name} onCommit={onSetPct} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>%</span>
        <button
          onClick={onToggleLock}
          aria-pressed={!!meal.locked}
          aria-label={`${meal.locked ? "Unlock" : "Lock"} ${meal.name}`}
          style={{ border: `1.5px solid ${meal.locked ? "#0a0a0a" : "#e8e8e8"}`, background: meal.locked ? "#0a0a0a" : "#fff", color: meal.locked ? "#fff" : "#888", borderRadius: 16, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
        >
          {meal.locked ? "Locked" : "Auto"}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onSelect} style={{ border: "1.5px solid #e8e8e8", background: "#fff", color: "#0a0a0a", borderRadius: 16, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
          Foods ›
        </button>
      </div>
    </div>
  );
}

function PctField({ value, name, onCommit }) {
  const [v, setV] = useState(String(value));
  const commit = () => {
    const n = Math.round(Number(v));
    if (v.trim() === "" || !Number.isFinite(n) || n === Number(value)) return setV(String(value));
    onCommit(n);
    setV(String(value)); // if the change was capped back to the same value
  };
  return (
    <input type="number" inputMode="numeric" min="0" max="100" value={v} aria-label={`${name} percent of day`} onFocus={(e) => e.target.select()}
      onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} style={{ ...inputStyle, width: 64 }} />
  );
}
