"use client";

import { useEffect, useRef, useState } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  fbPersonExists, fbOpenPerson, fbLoadPerson, fbSavePerson, fbLoadMeals, fbSaveMeal, fbDeleteMeal,
  fbLoadRecentDays, fbLoadDay, fbSaveEntry, fbDeleteEntry,
} from "@/lib/db";
import { loadPerson, rememberPerson } from "@/lib/person";
import { dateKey } from "@/lib/log";
import { computeDailyTargets, computeMealTargets, estimateMealHour, formatHour } from "@/lib/solver";
import { FOODS, FOOD_LOOKUP } from "@/lib/foods";
import SetupPage from "./SetupPage";
import MealBuilder from "./MealBuilder";
import LogPage from "./LogPage";
import HistoryPage from "./HistoryPage";
import NameScreen from "./NameScreen";
import TabBar from "./TabBar";

// New accounts start at zero -- targets are personal, so nothing is assumed.
const DEFAULT_INPUTS = { calories: 0, bodyWeight: 0, lbm: 0, proteinRatio: 0, fatPct: 0 };
const DEFAULT_TARGETS = { calories: 0, proteinG: 0, fatG: 0, carbG: 0 };

const ALL_FOODS = Object.values(FOODS).flat();

const DEFAULT_TRAINING_TIME = "18:00";
const DEFAULT_CARB_TIMING = "even";
const DEFAULT_MEAL_COUNT = 3;

// Splits 100% across n meals as whole numbers that sum to exactly 100
// (any remainder goes to the first meals) rather than a repeating decimal.
function evenPctSplit(n) {
  const base = Math.floor(100 / n);
  const remainder = 100 - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

function makeDefaultMeals() {
  const pcts = evenPctSplit(DEFAULT_MEAL_COUNT);
  return pcts.map((pctOfDay, i) => ({
    id: `meal_${Date.now()}_${i}`,
    name: `Meal ${i + 1}`,
    pctOfDay,
    proteinFood: "",
    carbFood: "",
    fatFood: "",
    extras: [],
  }));
}

export default function App() {
  const [uid, setUid] = useState(null);
  const [person, setPerson] = useState(null);
  const [needsName, setNeedsName] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(0);
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [trainingTime, setTrainingTime] = useState(DEFAULT_TRAINING_TIME);
  const [carbTiming, setCarbTiming] = useState(DEFAULT_CARB_TIMING);
  const [meals, setMeals] = useState([]);
  const [days, setDays] = useState({}); // date → day doc, or null if nothing logged
  const [today, setToday] = useState(() => dateKey());
  const [date, setDate] = useState(() => dateKey());
  const [selectedMealId, setSelectedMealId] = useState(null);
  const [activeTab, setActiveTab] = useState("log");
  const saveTimer = useRef(null);
  const personId = person?.id;

  // Anonymous sign-in satisfies the Firestore rules; the name is the identity.
  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (user) {
          const p = loadPerson();
          setUid(user.uid);
          if (p) setPerson(p);
          else setNeedsName(true);
        } else {
          signInAnonymously(auth).catch((e) => {
            console.error(e);
            setLoadError(true);
          });
        }
      }),
    [attempt]
  );

  useEffect(() => {
    if (!personId) return;
    let stale = false;
    (async () => {
      try {
        const [doc, savedMeals, recent] = await Promise.all([fbLoadPerson(personId), fbLoadMeals(personId), fbLoadRecentDays(personId)]);
        if (stale) return;
        if (doc?.inputs) setInputs(doc.inputs);
        if (doc?.targets) setTargets(doc.targets);
        if (doc?.trainingTime) setTrainingTime(doc.trainingTime);
        if (doc?.carbTiming) setCarbTiming(doc.carbTiming);
        setDays(Object.fromEntries(recent.map((d) => [d.date, d])));
        if (savedMeals.length) {
          setMeals(savedMeals);
        } else {
          // Nothing saved yet -- seed a starting point rather than "0 meals".
          const defaults = makeDefaultMeals();
          setMeals(defaults);
          await Promise.all(defaults.map((m) => fbSaveMeal(personId, m)));
        }
        if (!stale) setLoaded(true);
      } catch (e) {
        console.error(e);
        if (!stale) setLoadError(true);
      }
    })();
    return () => {
      stale = true;
    };
  }, [personId, attempt]);

  // Runs a save; on failure tells the user and reports false.
  const save = async (promise) => {
    setSaving((n) => n + 1);
    try {
      await promise;
      setSaveError(false);
      return true;
    } catch (e) {
      console.error(e);
      setSaveError(true);
      return false;
    } finally {
      setSaving((n) => n - 1);
    }
  };

  // Debounced save of daily targets/inputs -- avoid a Firestore write per keystroke.
  useEffect(() => {
    if (!personId || !loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fbSavePerson(personId, { inputs, targets, trainingTime, carbTiming }).catch((e) => {
        console.error(e);
        setSaveError(true);
      });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [personId, loaded, inputs, targets, trainingTime, carbTiming]);

  // Left open overnight: roll "today" over so breakfast doesn't land on yesterday.
  useEffect(() => {
    const check = () => {
      const now = dateKey();
      if (now === today) return;
      setToday(now);
      setDate((d) => (d === today ? now : d));
    };
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, 60000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      clearInterval(timer);
    };
  }, [today]);

  // Days older than the initial batch load when opened.
  const dayReady = date in days;
  useEffect(() => {
    if (!personId || !loaded || dayReady) return;
    let stale = false;
    fbLoadDay(personId, date)
      .then((d) => {
        if (!stale) setDays((prev) => (date in prev ? prev : { ...prev, [date]: d }));
      })
      .catch((e) => {
        console.error(e);
        if (!stale) setLoadError(true);
      });
    return () => {
      stale = true;
    };
  }, [personId, loaded, date, dayReady, attempt]);

  // Past days keep the targets they were logged against.
  const dayTargets = (date !== today && days[date]?.targets) || targets;

  const setEntry = (d, id, entry) =>
    setDays((prev) => {
      const entries = { ...(prev[d]?.entries || {}) };
      if (entry) entries[id] = entry;
      else delete entries[id];
      return { ...prev, [d]: { ...(prev[d] || { date: d }), targets: dayTargets, entries } };
    });

  // Show it right away, put it back if the save fails.
  const saveEntry = async (entry) => {
    const before = days[date]?.entries?.[entry.id];
    setEntry(date, entry.id, entry);
    if (!(await save(fbSaveEntry(personId, date, dayTargets, entry)))) setEntry(date, entry.id, before);
  };
  const deleteEntry = async (id) => {
    const before = days[date]?.entries?.[id];
    setEntry(date, id, null);
    if (!(await save(fbDeleteEntry(personId, date, id)))) setEntry(date, id, before);
  };

  const openPerson = async (p) => {
    await fbOpenPerson(p, uid);
    rememberPerson(p);
    setPerson(p);
    setNeedsName(false);
  };
  const switchPerson = () => {
    rememberPerson(null);
    window.location.reload();
  };

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
        setActiveTab("setup");
      }
      removed.forEach((m) => {
        save(fbDeleteMeal(personId, m.id));
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
        save(fbSaveMeal(personId, m));
      });
    }
  };

  const selectMeal = (id) => {
    setSelectedMealId(id);
    setActiveTab("meal");
  };

  const updateMeal = (id, patch) => {
    const current = meals.find((x) => x.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setMeals((m) => m.map((x) => (x.id === id ? updated : x)));
    save(fbSaveMeal(personId, updated));
  };

  const selectedMealIndex = meals.findIndex((m) => m.id === selectedMealId);
  const selectedMeal = selectedMealIndex >= 0 ? meals[selectedMealIndex] : null;
  const mealTargetsList = computeMealTargets(meals, targets, { trainingTime, carbTiming });
  const selectedMealTargets = selectedMealIndex >= 0 ? mealTargetsList[selectedMealIndex] : null;
  const selectedMealEstimatedTime =
    selectedMealIndex >= 0 ? formatHour(estimateMealHour(selectedMealIndex, meals.length)) : null;

  if (loadError) {
    return (
      <div style={{ padding: "120px 24px", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
        <div style={{ marginBottom: 16 }}>Couldn&rsquo;t load your log. Nothing has been changed.</div>
        <button
          onClick={() => {
            setLoadError(false);
            setAttempt((n) => n + 1);
          }}
          style={{ background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}
        >
          Try again
        </button>
      </div>
    );
  }
  if (needsName) return <NameScreen onCheck={(p) => fbPersonExists(p.id)} onOpen={openPerson} />;
  if (!loaded) return <div style={{ padding: "120px 24px", textAlign: "center", color: "#bbb", fontSize: 13 }}>Loading…</div>;

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
          { key: "log", label: "Log" },
          { key: "history", label: "History" },
          { key: "setup", label: "Setup" },
          { key: "meal", label: selectedMeal ? selectedMeal.name : "Meal", disabled: !selectedMeal },
        ]}
      />

      {saveError && (
        <div style={{ flexShrink: 0, background: "#fff5f5", color: "#a4302a", padding: "10px 20px", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
          Your last change didn&rsquo;t save. Check your connection and try it again.
        </div>
      )}

      <main style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {activeTab === "log" ? (
            <LogPage
              date={date}
              today={today}
              onDateChange={setDate}
              day={days[date]}
              ready={dayReady}
              targets={dayTargets}
              meals={meals}
              mealTargets={mealTargetsList}
              foodLookup={FOOD_LOOKUP}
              allFoods={ALL_FOODS}
              saving={saving > 0}
              onSaveEntry={saveEntry}
              onDeleteEntry={deleteEntry}
            />
          ) : activeTab === "history" ? (
            <HistoryPage
              days={days}
              today={today}
              onOpen={(d) => {
                setDate(d);
                setActiveTab("log");
              }}
            />
          ) : activeTab === "setup" ? (
            <>
            <SetupPage
              inputs={inputs}
              targets={targets}
              onRecalc={recalcTargets}
              onEditTargets={setTargets}
              meals={meals}
              onMealCountChange={setMealCount}
              selectedMealId={selectedMealId}
              onSelect={selectMeal}
              onUpdate={updateMeal}
              trainingTime={trainingTime}
              onTrainingTimeChange={setTrainingTime}
              carbTiming={carbTiming}
              onCarbTimingChange={setCarbTiming}
            />
            <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "#888", marginTop: 16 }}>
              Logging as {person.firstName} {person.lastName} ·{" "}
              <button onClick={switchPerson} style={{ background: "none", border: "none", fontSize: 12, fontWeight: 800, color: "#0a0a0a", cursor: "pointer" }}>
                Switch person
              </button>
            </div>
            </>
          ) : selectedMeal ? (
            <>
              <MealBuilder
                meal={selectedMeal}
                mealTargets={selectedMealTargets}
                estimatedTime={selectedMealEstimatedTime}
                foods={FOODS}
                foodLookup={FOOD_LOOKUP}
                onUpdate={(patch) => updateMeal(selectedMeal.id, patch)}
              />
              <div style={{ fontSize: 11, fontWeight: 600, color: "#bbb", marginTop: 16, textAlign: "center" }}>
                Food data from USDA FoodData Central, fdc.nal.usda.gov
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#bbb" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>No meal selected</div>
              <div style={{ fontSize: 13 }}>Pick how many meals you want on the Setup tab, then tap one to build it here.</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
