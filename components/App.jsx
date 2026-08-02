"use client";

import { useState } from "react";
import { computeDailyTargets } from "@/lib/solver";
import { FOODS, FOOD_LOOKUP } from "@/lib/foods";
import DailyTargetsForm from "./DailyTargetsForm";
import Timeline from "./Timeline";
import MealBuilder from "./MealBuilder";

const DEFAULT_INPUTS = {
  calories: 2500,
  bodyWeight: 200,
  lbm: 178,
  proteinRatio: 1.5,
  fatPct: 30,
};

export default function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [targets, setTargets] = useState(() =>
    computeDailyTargets({
      calories: DEFAULT_INPUTS.calories,
      lbm: DEFAULT_INPUTS.lbm,
      proteinRatioPerLbLbm: DEFAULT_INPUTS.proteinRatio,
      fatPctOfCalories: DEFAULT_INPUTS.fatPct,
    })
  );
  const [dayRange, setDayRange] = useState({ start: "06:00", end: "22:00" });
  const [meals, setMeals] = useState([]);
  const [selectedMealId, setSelectedMealId] = useState(null);

  const recalcTargets = (newInputs) => {
    setInputs(newInputs);
    setTargets(
      computeDailyTargets({
        calories: newInputs.calories,
        lbm: newInputs.lbm,
        proteinRatioPerLbLbm: newInputs.proteinRatio,
        fatPctOfCalories: newInputs.fatPct,
      })
    );
  };

  const addMeal = () => {
    const id = `meal_${Date.now()}`;
    setMeals((m) => [
      ...m,
      { id, name: "New meal", time: "12:00", pctOfDay: 0, proteinFood: "", carbFood: "", fatFood: "", extras: [] },
    ]);
    setSelectedMealId(id);
  };

  const updateMeal = (id, patch) => setMeals((m) => m.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const removeMeal = (id) => {
    setMeals((m) => m.filter((x) => x.id !== id));
    setSelectedMealId((sel) => (sel === id ? null : sel));
  };

  const selectedMeal = meals.find((m) => m.id === selectedMealId) || null;

  return (
    <div style={{ minHeight: "100dvh", background: "#f5f5f5", padding: "52px 20px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#0a0a0a", letterSpacing: "-0.04em", lineHeight: 1 }}>
            STACK NUTRITION
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#888", marginTop: 8 }}>
            Tell it what you&rsquo;re eating, it tells you how much.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <DailyTargetsForm inputs={inputs} targets={targets} onRecalc={recalcTargets} onEditTargets={setTargets} />

          <Timeline
            meals={meals}
            dayRange={dayRange}
            onRangeChange={setDayRange}
            selectedMealId={selectedMealId}
            onAdd={addMeal}
            onSelect={setSelectedMealId}
            onUpdate={updateMeal}
            onRemove={removeMeal}
          />

          {selectedMeal && (
            <MealBuilder
              meal={selectedMeal}
              dailyTargets={targets}
              foods={FOODS}
              foodLookup={FOOD_LOOKUP}
              onUpdate={(patch) => updateMeal(selectedMeal.id, patch)}
            />
          )}
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", marginTop: 40, textAlign: "center" }}>
          Food data from USDA FoodData Central, fdc.nal.usda.gov
        </div>
      </div>
    </div>
  );
}
