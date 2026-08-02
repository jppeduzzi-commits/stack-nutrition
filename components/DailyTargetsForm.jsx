"use client";

import { useState } from "react";
import MacroBadge from "./MacroBadge";

const card = {
  background: "#fff",
  border: "1.5px solid #e8e8e8",
  borderRadius: 16,
  padding: 24,
};

const sectionLabel = {
  fontSize: 11,
  fontWeight: 800,
  color: "#bbb",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 16,
};

const inputStyle = {
  width: "100%",
  border: "1.5px solid #e8e8e8",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 15,
  fontWeight: 700,
  color: "#0a0a0a",
  outline: "none",
};

const fieldLabel = {
  fontSize: 11,
  fontWeight: 700,
  color: "#888",
  marginBottom: 6,
  letterSpacing: "0.02em",
};

function Field({ label, value, onChange, step }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <input type="number" step={step ?? "1"} value={value} onChange={onChange} style={inputStyle} />
    </div>
  );
}

function TargetField({ macro, value, onChange }) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <MacroBadge macro={macro} />
      </div>
      <input
        type="number"
        step="0.1"
        value={Math.round(value * 10) / 10}
        onChange={onChange}
        style={inputStyle}
      />
      <div style={{ fontSize: 11, fontWeight: 700, color: "#bbb", marginTop: 4 }}>grams / day</div>
    </div>
  );
}

export default function DailyTargetsForm({ inputs, targets, onRecalc, onEditTargets }) {
  const [draft, setDraft] = useState(inputs);

  const setField = (key) => (e) => {
    const raw = e.target.value;
    setDraft((d) => ({ ...d, [key]: raw === "" ? "" : Number(raw) }));
  };

  const setTargetField = (key) => (e) => {
    const raw = e.target.value;
    onEditTargets({ ...targets, [key]: raw === "" ? 0 : Number(raw) });
  };

  return (
    <section style={card}>
      <div style={sectionLabel}>Daily targets</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 16 }}>
        <Field label="Body weight (lb)" value={draft.bodyWeight} onChange={setField("bodyWeight")} />
        <Field label="Lean body mass (lb)" value={draft.lbm} onChange={setField("lbm")} />
        <Field label="Protein (g / lb LBM)" value={draft.proteinRatio} onChange={setField("proteinRatio")} step="0.1" />
        <Field label="Fat (% of calories)" value={draft.fatPct} onChange={setField("fatPct")} />
        <Field label="Calories" value={draft.calories} onChange={setField("calories")} />
      </div>

      <button
        onClick={() => onRecalc(draft)}
        style={{
          background: "#0a0a0a",
          color: "#fff",
          border: "none",
          borderRadius: 20,
          padding: "10px 20px",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        Recalculate targets
      </button>

      <div style={{ height: 1, background: "#e8e8e8", margin: "22px 0" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
        <TargetField macro="protein" value={targets.proteinG} onChange={setTargetField("proteinG")} />
        <TargetField macro="carb" value={targets.carbG} onChange={setTargetField("carbG")} />
        <TargetField macro="fat" value={targets.fatG} onChange={setTargetField("fatG")} />
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: "#bbb", marginTop: 14 }}>
        {Math.round(targets.calories)} kcal/day target. Macros above are editable directly and won&rsquo;t be
        overwritten until you hit Recalculate.
      </div>
    </section>
  );
}
