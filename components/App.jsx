"use client";

import { useEffect, useRef, useState } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fbLoadUser, fbSaveUser, fbLoadMeals, fbSaveMeal, fbDeleteMeal } from "@/lib/db";
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

const DEFAULT_TARGETS = computeDailyTargets({
  calories: DEFAULT_INPUTS.calories,
  lbm: DEFAULT_INPUTS.lbm,
  proteinRatioPerLbLbm: DEFAULT_INPUTS.proteinRatio,
  fatPctOfCalories: DEFAULT_INPUTS.fatPct,
});

const DEFAULT_DAY_RANGE = { start: "06:00", end: "22:00" };

export default function App() {
  const [uid, setUid] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [dayRange, setDayRange] = useState(DEFAULT_DAY_RANGE);
  const [meals, setMeals] = useState([]);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const saveTimer = useRef(null);

  // Sign in anonymously and load any previously saved state for this device.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else signInAnonymously(auth).catch((e) => console.error(e));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const [userDoc, savedMeals] = await Promise.all([fbLoadUser(uid), fbLoadMeals(uid)]);
      if (userDoc) {
        if (userDoc.inputs) setInputs(userDoc.inputs);
        if (userDoc.targets) setTargets(userDoc.targets);
        if (userDoc.dayRange) setDayRange(userDoc.dayRange);
      }
      if (savedMeals?.length) setMeals(savedMeals);
      setLoaded(true);
    })();
  }, [uid]);

  // Debounced save of daily targets/inputs -- avoid a Firestore write per keystroke.
  useEffect(() => {
    if (!uid || !loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fbSaveUser(uid, { inputs, targets, dayRange });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [uid, loaded, inputs, targets, dayRange]);

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

  const addMeal = (time = "12:00") => {
    const id = `meal_${Date.now()}`;
    const meal = { id, name: "New meal", time, pctOfDay: 0, proteinFood: "", carbFood: "", fatFood: "", extras: [] };
    setMeals((m) => [...m, meal]);
    setSelectedMealId(id);
    if (uid) fbSaveMeal(uid, meal);
  };

  const updateMeal = (id, patch) => {
    let updated = null;
    setMeals((m) =>
      m.map((x) => {
        if (x.id !== id) return x;
        updated = { ...x, ...patch };
        return updated;
      })
    );
    if (uid && updated) fbSaveMeal(uid, updated);
  };

  const removeMeal = (id) => {
    setMeals((m) => m.filter((x) => x.id !== id));
    setSelectedMealId((sel) => (sel === id ? null : sel));
    if (uid) fbDeleteMeal(uid, id);
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
