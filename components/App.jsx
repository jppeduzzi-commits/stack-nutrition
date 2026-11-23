"use client";

import { useEffect, useRef, useState } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fbLoadUser, fbSaveUser, fbLoadMeals, fbSaveMeal, fbDeleteMeal } from "@/lib/db";
import { computeDailyTargets } from "@/lib/solver";
import { FOODS, FOOD_LOOKUP } from "@/lib/foods";
import DailyTargetsForm from "./DailyTargetsForm";
import MealsList from "./MealsList";
import MealBuilder from "./MealBuilder";
import TabBar from "./TabBar";

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

export default function App() {
  const [uid, setUid] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [meals, setMeals] = useState([]);
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [activeTab, setActiveTab] = useState("targets");
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
      fbSaveUser(uid, { inputs, targets });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [uid, loaded, inputs, targets]);

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

  // Standard meal count replaces the old time-of-day schedule: changing it
  // appends/trims blank meals from the end rather than editing clock times.
  const setMealCount = (n) => {
    if (n === meals.length) return;
    if (n < meals.length) {
      const removed = meals.slice(n);
      const next = meals.slice(0, n);
      setMeals(next);
      if (selectedMealId && removed.some((m) => m.id === selectedMealId)) {
        setSelectedMealId(null);
        setActiveTab("meals");
      }
      removed.forEach((m) => {
        if (uid) fbDeleteMeal(uid, m.id);
      });
    } else {
      const additions = Array.from({ length: n - meals.length }, (_, i) => ({
        id: `meal_${Date.now()}_${i}`,
        name: `Meal ${meals.length + i + 1}`,
        pctOfDay: 0,
        proteinFood: "",
        carbFood: "",
        fatFood: "",
        extras: [],
      }));
      setMeals([...meals, ...additions]);
      additions.forEach((m) => {
        if (uid) fbSaveMeal(uid, m);
      });
    }
  };

  const selectMeal = (id) => {
    setSelectedMealId(id);
    setActiveTab("meal");
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

  const selectedMeal = meals.find((m) => m.id === selectedMealId) || null;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#f5f5f5" }}>
      <header style={{ flexShrink: 0, padding: "20px 20px 4px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#0a0a0a", letterSpacing: "-0.03em", lineHeight: 1 }}>
            STACK NUTRITION
          </div>
        </div>
      </header>

      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: "targets", label: "Targets" },
          { key: "meals", label: "Meals" },
          { key: "meal", label: selectedMeal ? selectedMeal.name : "Meal", disabled: !selectedMeal },
        ]}
      />

      <main style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {activeTab === "targets" ? (
            <DailyTargetsForm inputs={inputs} targets={targets} onRecalc={recalcTargets} onEditTargets={setTargets} />
          ) : activeTab === "meals" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <MealsList
                meals={meals}
                onMealCountChange={setMealCount}
                selectedMealId={selectedMealId}
                onSelect={selectMeal}
                onUpdate={updateMeal}
              />

              <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", marginTop: 16, textAlign: "center" }}>
                Food data from USDA FoodData Central, fdc.nal.usda.gov
              </div>
            </div>
          ) : selectedMeal ? (
            <MealBuilder
              meal={selectedMeal}
              dailyTargets={targets}
              foods={FOODS}
              foodLookup={FOOD_LOOKUP}
              onUpdate={(patch) => updateMeal(selectedMeal.id, patch)}
            />
          ) : (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#bbb" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>No meal selected</div>
              <div style={{ fontSize: 13 }}>Pick how many meals you want on the Meals tab, then tap one to build it here.</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
