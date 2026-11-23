"use client";

import { useState } from "react";
import { MACRO_COLORS } from "@/lib/constants";
import { dayEntries, dayTotals, formatKey, itemsFromMeal, makeItem, newId, shiftKey, sumItems } from "@/lib/log";
import { solveMeal } from "@/lib/solver";
import ExtraFoodSearch from "./ExtraFoodSearch";

const card = { background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 14, padding: 14 };
const label = { fontSize: 10, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 };
// 16px so iOS doesn't zoom the page when the field is selected.
const gramsInput = { width: 76, border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "6px 8px", fontSize: 16, fontWeight: 700, color: "#0a0a0a", background: "#fff", outline: "none", textAlign: "right" };
const pill = { border: "1.5px solid #e8e8e8", background: "#fff", borderRadius: 16, padding: "6px 14px", fontSize: 12, fontWeight: 800, color: "#0a0a0a", cursor: "pointer", flexShrink: 0 };
const dark = { ...pill, background: "#0a0a0a", borderColor: "#0a0a0a", color: "#fff" };
const r = Math.round;

const ROWS = [
  ["protein", "Protein", "p", "proteinG"],
  ["carb", "Carbs", "c", "carbG"],
  ["fat", "Fat", "f", "fatG"],
];

export function macroLine(t) {
  return `${r(t.kcal)} cal · ${r(t.p)}P ${r(t.c)}C ${r(t.f)}F`;
}

export default function LogPage({ date, today, onDateChange, day, ready, targets, meals, mealTargets, foodLookup, allFoods, saving, onSaveEntry, onDeleteEntry }) {
  const entries = dayEntries(day);
  const totals = dayTotals(day);
  const left = r(targets.calories) - r(totals.kcal);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={pill} aria-label="Previous day" onClick={() => onDateChange(shiftKey(date, -1))}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 900 }}>{formatKey(date, today)}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#888", visibility: saving ? "visible" : "hidden" }}>Saving…</div>
        </div>
        <button style={{ ...pill, opacity: date >= today ? 0.3 : 1 }} aria-label="Next day" disabled={date >= today} onClick={() => onDateChange(shiftKey(date, 1))}>›</button>
      </div>

      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {r(totals.kcal)}<span style={{ fontSize: 13, color: "#888", fontWeight: 700 }}> / {r(targets.calories)} cal</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{left >= 0 ? `${left} left` : `${-left} over`}</div>
        </div>
        {ROWS.map(([macro, name, k, tk]) => {
          const goal = Number(targets[tk]) || 0;
          const diff = r(goal) - r(totals[k]);
          return (
            <div key={macro} style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                <span style={{ color: MACRO_COLORS[macro] }}>{name}</span>
                <span>{r(totals[k])} / {r(goal)}g <span style={{ color: "#888" }}>· {diff >= 0 ? `${diff} left` : `${-diff} over`}</span></span>
              </div>
              <div style={{ height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${goal > 0 ? Math.min(100, (totals[k] / goal) * 100) : 0}%`, background: MACRO_COLORS[macro] }} />
              </div>
            </div>
          );
        })}
      </section>

      {!ready ? (
        <div style={{ textAlign: "center", color: "#bbb", padding: 30, fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          <section style={card}>
            <div style={label}>Planned meals</div>
            {meals.map((m, i) => {
              const items = itemsFromMeal(m, solveMeal(m, null, foodLookup, mealTargets[i]), foodLookup);
              const logged = entries.some((e) => e.mealId === m.id);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: i ? "1px solid #f0f0f0" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{m.name}{logged && <span style={{ color: "#10B981" }}> ✓</span>}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>
                      {items ? macroLine(sumItems(items)) : "Not solved yet. Build it from Setup."}
                    </div>
                  </div>
                  {items && (
                    <button style={logged ? pill : dark} onClick={() => onSaveEntry({ id: newId("entry"), name: m.name, mealId: m.id, loggedAt: Date.now(), items })}>
                      {logged ? "Log again" : "Log meal"}
                    </button>
                  )}
                </div>
              );
            })}
          </section>

          <AddFood
            key={date}
            allFoods={allFoods}
            foodLookup={foodLookup}
            onAdd={(item) => onSaveEntry({ id: newId("entry"), name: item.name, mealId: null, loggedAt: Date.now(), items: [item] })}
          />

          <section style={card}>
            <div style={label}>Eaten</div>
            {entries.length === 0 && <div style={{ fontSize: 13, color: "#bbb", fontWeight: 600 }}>Nothing logged yet.</div>}
            {entries.map((e) => (
              <Entry key={e.id} entry={e} onSave={onSaveEntry} onDelete={() => onDeleteEntry(e.id)} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function AddFood({ allFoods, foodLookup, onAdd }) {
  const [food, setFood] = useState(null);
  const [grams, setGrams] = useState("");
  const [round, setRound] = useState(0); // remounts the search box after each add
  const g = Number(grams);
  const valid = food && g > 0;
  const pick = (v) => {
    setFood(v.p != null ? { id: v.food, name: v.name, p: v.p, c: v.c, f: v.f } : foodLookup[v.food]);
    if (v.servingSizeG) setGrams(String(Math.round(v.servingSizeG * 10) / 10));
  };
  const add = () => {
    if (!valid) return;
    onAdd(makeItem(food, g));
    setFood(null);
    setGrams("");
    setRound((n) => n + 1);
  };
  return (
    <section style={card}>
      <div style={label}>Add a food</div>
      <ExtraFoodSearch key={round} localList={allFoods} value={food ? { food: food.id, name: food.name } : null} onChange={pick} onClear={() => setFood(null)} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <input type="number" inputMode="decimal" min="0" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="0" aria-label="Grams" style={gramsInput} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#888" }}>g</span>
        <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#888" }}>{valid ? macroLine(sumItems([{ ...food, grams: g }])) : ""}</div>
        <button style={{ ...dark, opacity: valid ? 1 : 0.3 }} disabled={!valid} onClick={add}>Add</button>
      </div>
    </section>
  );
}

function Entry({ entry, onSave, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const setGrams = (id, grams) => onSave({ ...entry, items: entry.items.map((i) => (i.id === id ? { ...i, grams } : i)) });
  return (
    <div style={{ borderTop: "1px solid #f0f0f0", padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {entry.mealId && <div style={{ fontSize: 14, fontWeight: 800 }}>{entry.name}</div>}
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>{macroLine(sumItems(entry.items))}</div>
        </div>
        {confirming ? (
          <>
            <button style={{ ...pill, color: "#a4302a" }} onClick={onDelete}>Delete</button>
            <button style={pill} onClick={() => setConfirming(false)}>Keep</button>
          </>
        ) : (
          <button aria-label={`Delete ${entry.name}`} style={{ background: "none", border: "none", color: "#bbb", fontSize: 18, padding: "2px 8px", cursor: "pointer" }} onClick={() => setConfirming(true)}>×</button>
        )}
      </div>
      {entry.items.map((i) => (
        <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>{i.name}</div>
          <GramsField key={i.grams} grams={i.grams} name={i.name} onCommit={(g) => setGrams(i.id, g)} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#888" }}>g</span>
        </div>
      ))}
    </div>
  );
}

// Saves when you leave the field, not on every keystroke.
function GramsField({ grams, name, onCommit }) {
  const [v, setV] = useState(String(grams));
  const commit = () => {
    const n = Number(v);
    if (v.trim() === "" || !(n >= 0)) setV(String(grams));
    else if (n !== grams) onCommit(Math.round(n * 10) / 10);
  };
  return (
    <input type="number" inputMode="decimal" min="0" value={v} aria-label={`Grams of ${name}`} style={gramsInput}
      onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
  );
}
