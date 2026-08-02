"use client";

import { useMemo } from "react";
import { solveMeal } from "@/lib/solver";
import { MACRO_COLORS } from "@/lib/constants";
import MacroBadge from "./MacroBadge";
import FoodSearch from "./FoodSearch";

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

const selectStyle = {
  width: "100%",
  border: "1.5px solid #e8e8e8",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  fontWeight: 700,
  color: "#0a0a0a",
  outline: "none",
  background: "#fff",
};

const fieldLabel = {
  fontSize: 11,
  fontWeight: 700,
  color: "#888",
  marginBottom: 6,
};

function FoodSelect({ macro, list, value, onChange }) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <MacroBadge macro={macro} />
      </div>
      <FoodSearch list={list} value={value} onChange={onChange} placeholder="Search foods…" />
    </div>
  );
}

const ALL_ROLES = ["protein", "carb", "fat"];

export default function MealBuilder({ meal, dailyTargets, foods, foodLookup, onUpdate }) {
  const allFoods = useMemo(() => ALL_ROLES.concat("extra").flatMap((r) => foods[r] || []), [foods]);

  const result = solveMeal(meal, dailyTargets, foodLookup);

  const setPrimary = (role) => (id) => onUpdate({ [`${role}Food`]: id });

  const addExtra = () => onUpdate({ extras: [...(meal.extras || []), { food: "", grams: 0 }] });

  const updateExtra = (idx, patch) => {
    const extras = (meal.extras || []).map((ex, i) => (i === idx ? { ...ex, ...patch } : ex));
    onUpdate({ extras });
  };

  const removeExtra = (idx) => {
    const extras = (meal.extras || []).filter((_, i) => i !== idx);
    onUpdate({ extras });
  };

  const fmt = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : "—");

  return (
    <section style={card}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#0a0a0a", letterSpacing: "-0.01em" }}>{meal.name}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#bbb" }}>
          {meal.time} &middot; {meal.pctOfDay || 0}% of day
        </div>
      </div>
      <div style={sectionLabel}>Meal builder</div>

      {result && !result.error && (
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: MACRO_COLORS.protein }}>{fmt(result.mealP)}g protein</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: MACRO_COLORS.carb }}>{fmt(result.mealC)}g carb</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: MACRO_COLORS.fat }}>{fmt(result.mealF)}g fat</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
        <FoodSelect macro="protein" list={foods.protein} value={meal.proteinFood} onChange={setPrimary("protein")} />
        <FoodSelect macro="carb" list={foods.carb} value={meal.carbFood} onChange={setPrimary("carb")} />
        <FoodSelect macro="fat" list={foods.fat} value={meal.fatFood} onChange={setPrimary("fat")} />
      </div>

      <div style={{ height: 1, background: "#e8e8e8", margin: "20px 0" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={fieldLabel}>Extras (fixed quantity, subtracted before solving)</div>
        <button
          onClick={addExtra}
          style={{
            background: "none",
            border: "1.5px solid #e8e8e8",
            borderRadius: 20,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          + Add extra
        </button>
      </div>

      {(meal.extras || []).map((ex, idx) => (
        <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <FoodSearch
              list={allFoods}
              value={ex.food}
              onChange={(id) => updateExtra(idx, { food: id })}
              placeholder="Search foods…"
            />
          </div>
          <input
            type="number"
            value={ex.grams}
            onChange={(e) => updateExtra(idx, { grams: e.target.value === "" ? "" : Number(e.target.value) })}
            style={{ ...selectStyle, width: 90 }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>g</span>
          <button
            onClick={() => removeExtra(idx)}
            style={{ background: "none", border: "none", color: "#bbb", fontSize: 18, cursor: "pointer" }}
          >
            &times;
          </button>
        </div>
      ))}

      <div style={{ height: 1, background: "#e8e8e8", margin: "20px 0" }} />

      <div style={fieldLabel}>Result</div>

      {result?.error === "missing_food" && (
        <div style={{ color: "#bbb", fontSize: 13, fontWeight: 600, marginTop: 8 }}>
          Choose a protein, carb, and fat food above to solve this meal.
        </div>
      )}

      {result?.error === "singular" && (
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #f3c9c6",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#a4302a",
            marginTop: 8,
          }}
        >
          These three foods don&rsquo;t have distinct enough macro ratios to solve for a unique combination.
          Swap one of them for something with a different macro profile.
        </div>
      )}

      {result && !result.error && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginTop: 12 }}>
            <ResultStat macro="protein" label={foodLookup[meal.proteinFood]?.name} grams={result.proteinFoodGrams} />
            <ResultStat macro="carb" label={foodLookup[meal.carbFood]?.name} grams={result.carbFoodGrams} />
            <ResultStat macro="fat" label={foodLookup[meal.fatFood]?.name} grams={result.fatFoodGrams} />
          </div>

          {result.infeasible && (
            <div
              style={{
                background: "#fff5f5",
                border: "1px solid #f3c9c6",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: "#a4302a",
                marginTop: 16,
              }}
            >
              Can&rsquo;t hit this meal&rsquo;s target with these foods &mdash; the exact solve wants a negative
              amount of one of them (raw solve: {result.rawSolution.map((v) => fmt(v)).join(", ")}g). Swap a food or
              adjust the extras rather than trusting the clamped 0 above.
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ResultStat({ macro, label, grams }) {
  const fmt = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : "—");
  return (
    <div>
      <div style={{ marginBottom: 6 }}>
        <MacroBadge macro={macro} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#0a0a0a", letterSpacing: "-0.02em" }}>{fmt(grams)}g</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#bbb", marginTop: 2 }}>{label || "—"}</div>
    </div>
  );
}
