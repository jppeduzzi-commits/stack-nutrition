"use client";

import { useState } from "react";
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
  fontSize: 13,
  fontWeight: 700,
  color: "#0a0a0a",
  outline: "none",
  background: "#fff",
};

const MIN_MEALS = 1;
const MAX_MEALS = 8;

const CARB_TIMING_OPTIONS = [
  { key: "even", label: "Even split" },
  { key: "shift", label: "Near workout" },
];

// Everything you set up once (and glance at, rarely edit) lives on this one
// dense page -- daily macro targets, meal count, each meal's % of day, and
// carb/fat timing -- so there's no horizontal overflow or pinch-zooming to
// find a control. Food logging itself lives on the other tab.
export default function SetupPage({
  inputs,
  targets,
  onRecalc,
  onEditTargets,
  meals,
  onMealCountChange,
  selectedMealId,
  onSelect,
  onUpdate,
  trainingTime,
  onTrainingTimeChange,
  carbTiming,
  onCarbTimingChange,
}) {
  const [draft, setDraft] = useState(inputs);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const setField = (key) => (e) => {
    const raw = e.target.value;
    setDraft((d) => ({ ...d, [key]: raw === "" ? "" : Number(raw) }));
  };

  const setTargetField = (key) => (e) => {
    const raw = e.target.value;
    onEditTargets({ ...targets, [key]: raw === "" ? 0 : Number(raw) });
  };

  const fmt = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : "—");
  const pctTotal = meals.reduce((s, m) => s + (Number(m.pctOfDay) || 0), 0);
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
          <Stepper value={meals.length} min={MIN_MEALS} max={MAX_MEALS} onChange={onMealCountChange} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {meals.map((m) => (
            <MealRow
              key={m.id}
              meal={m}
              selected={m.id === selectedMealId}
              onSelect={() => onSelect(m.id)}
              onUpdate={(patch) => onUpdate(m.id, patch)}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: pctOk ? "#10B981" : "#E4574C" }}>
            {fmt(pctTotal)}% of day {pctOk ? "✓" : "(needs 100%)"}
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
              style={{ ...inputStyle, width: 104 }}
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
      <input type="number" step="0.1" value={Math.round(value * 10) / 10} onChange={onChange} style={{ ...inputStyle, width: "100%" }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: "#bbb", marginTop: 2 }}>g/day</div>
    </div>
  );
}

function MiniField({ label, value, onChange, step }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#888", marginBottom: 3 }}>{label}</div>
      <input type="number" step={step ?? "1"} value={value} onChange={onChange} style={{ ...inputStyle, width: "100%" }} />
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

function MealRow({ meal, selected, onSelect, onUpdate }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        borderRadius: 9,
        border: `1.5px solid ${selected ? "#0a0a0a" : "#e8e8e8"}`,
        background: selected ? "#0a0a0a" : "#fafafa",
        cursor: "pointer",
      }}
    >
      <input
        type="text"
        value={meal.name}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUpdate({ name: e.target.value })}
        style={{
          ...inputStyle,
          flex: 1,
          minWidth: 0,
          padding: "5px 8px",
          fontSize: 12,
          background: selected ? "#1a1a1a" : "#fff",
          color: selected ? "#fff" : "#0a0a0a",
          border: `1.5px solid ${selected ? "#333" : "#e8e8e8"}`,
        }}
      />
      <input
        type="number"
        value={meal.pctOfDay}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUpdate({ pctOfDay: e.target.value === "" ? "" : Number(e.target.value) })}
        style={{
          ...inputStyle,
          width: 44,
          padding: "5px 6px",
          fontSize: 12,
          background: selected ? "#1a1a1a" : "#fff",
          color: selected ? "#fff" : "#0a0a0a",
          border: `1.5px solid ${selected ? "#333" : "#e8e8e8"}`,
        }}
      />
      <span style={{ fontSize: 10, fontWeight: 700, color: selected ? "#bbb" : "#888" }}>%</span>
      <span style={{ fontSize: 15, color: selected ? "#fff" : "#ccc", lineHeight: 1 }}>&rsaquo;</span>
    </div>
  );
}
