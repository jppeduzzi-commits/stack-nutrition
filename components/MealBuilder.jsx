"use client";

import { useMemo } from "react";
import { solveMeal } from "@/lib/solver";
import { MACRO_COLORS } from "@/lib/constants";
import MacroBadge from "./MacroBadge";
import FoodSearch from "./FoodSearch";
import ExtraFoodSearch from "./ExtraFoodSearch";

const card = {
  background: "#fff",
  border: "1.5px solid #e8e8e8",
  borderRadius: 16,
  padding: 20,
};

const sectionLabel = {
  fontSize: 11,
  fontWeight: 800,
  color: "#bbb",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  marginBottom: 14,
};

const selectStyle = {
  width: "100%",
  border: "1.5px solid #e8e8e8",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  fontWeight: 700,
  color: "#0a0a0a",
  outline: "none",
  background: "#fff",
};

const ALL_ROLES = ["protein", "carb", "fat"];

// Each macro gets one card: a primary food the solver fits exactly, plus as
// many other foods as you want typed in right there -- no more dumping
// everything that isn't the one primary pick into a separate misc bucket.
// Those extra picks are fixed-quantity and just get subtracted from the
// meal's target before the primary is solved for.
function MacroSection({ macro, foods, foodLookup, primaryValue, onPrimaryChange, extras, onAddExtra, onUpdateExtra, onRemoveExtra, allFoods, resultGrams, resultLabel }) {
  const fmt = (n) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : "—");
  return (
    <section style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <MacroBadge macro={macro} />
        {Number.isFinite(resultGrams) && (
          <div style={{ fontSize: 13, fontWeight: 800, color: MACRO_COLORS[macro] }}>{fmt(resultGrams)}g</div>
        )}
      </div>

      <FoodSearch list={foods} value={primaryValue} onChange={onPrimaryChange} placeholder="Search foods…" />
      {resultLabel && (
        <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", marginTop: 6 }}>solved: {resultLabel}</div>
      )}

      {extras.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {extras.map(({ ex, i }) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ExtraFoodSearch
                  localList={allFoods}
                  value={ex}
                  onChange={(picked) =>
                    onUpdateExtra(i, {
                      ...picked,
                      grams: ex.grams ? ex.grams : picked.servingSizeG || ex.grams,
                    })
                  }
                  placeholder="Search foods…"
                />
              </div>
              <input
                type="number"
                value={ex.grams}
                onChange={(e) => onUpdateExtra(i, { grams: e.target.value === "" ? "" : Number(e.target.value) })}
                style={{ ...selectStyle, width: 64 }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>g</span>
              <button
                onClick={() => onRemoveExtra(i)}
                style={{ background: "none", border: "none", color: "#bbb", fontSize: 17, cursor: "pointer", padding: "0 2px" }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddExtra}
        style={{
          marginTop: 12,
          background: "none",
          border: "1.5px solid #e8e8e8",
          borderRadius: 20,
          padding: "5px 12px",
          fontSize: 11,
          fontWeight: 800,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        + Add another {macro} food
      </button>
    </section>
  );
}

export default function MealBuilder({ meal, mealTargets, estimatedTime, foods, foodLookup, onUpdate }) {
  const allFoods = useMemo(() => ALL_ROLES.concat("extra").flatMap((r) => foods[r] || []), [foods]);

  const result = solveMeal(meal, null, foodLookup, mealTargets);

  const setPrimary = (role) => (id) => onUpdate({ [`${role}Food`]: id });

  const extrasBySection = (section) =>
    (meal.extras || [])
      .map((ex, i) => ({ ex, i }))
      // Extras saved before this per-section layout existed have no `section`
      // tag -- surface them under Protein rather than silently dropping them.
      .filter(({ ex }) => (ex.section || "protein") === section);

  const addExtra = (section) => onUpdate({ extras: [...(meal.extras || []), { food: "", grams: 0, section }] });

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#0a0a0a", letterSpacing: "-0.01em" }}>{meal.name}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#bbb" }}>
          {estimatedTime ? `~${estimatedTime} · ` : ""}
          {meal.pctOfDay || 0}% of day
        </div>
      </div>

      {result?.error === "missing_food" && (
        <div style={{ ...card, color: "#bbb", fontSize: 13, fontWeight: 600 }}>
          Pick a protein, carb, and fat food below to solve this meal.
        </div>
      )}

      {result?.error === "singular" && (
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #f3c9c6",
            borderRadius: 16,
            padding: "14px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: "#a4302a",
          }}
        >
          These three foods don&rsquo;t have distinct enough macro ratios to solve for a unique combination. Swap
          one of them for something with a different macro profile.
        </div>
      )}

      {result?.infeasible && (
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #f3c9c6",
            borderRadius: 16,
            padding: "14px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: "#a4302a",
          }}
        >
          Can&rsquo;t hit this meal&rsquo;s target with these foods &mdash; the exact solve wants a negative amount
          of one of them. Swap a food or adjust the extras rather than trusting the clamped 0 below.
        </div>
      )}

      {ALL_ROLES.map((role) => (
        <MacroSection
          key={role}
          macro={role}
          foods={foods[role]}
          foodLookup={foodLookup}
          primaryValue={meal[`${role}Food`]}
          onPrimaryChange={setPrimary(role)}
          extras={extrasBySection(role)}
          onAddExtra={() => addExtra(role)}
          onUpdateExtra={updateExtra}
          onRemoveExtra={removeExtra}
          allFoods={allFoods}
          resultGrams={result && !result.error ? result[`${role}FoodGrams`] : undefined}
          resultLabel={result && !result.error ? foodLookup[meal[`${role}Food`]]?.name : undefined}
        />
      ))}
    </div>
  );
}
