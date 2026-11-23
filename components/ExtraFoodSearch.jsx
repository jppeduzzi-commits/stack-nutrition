"use client";

import { useEffect, useRef, useState } from "react";

const inputStyle = {
  width: "100%",
  border: "1.5px solid #e8e8e8",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 16,
  fontWeight: 700,
  color: "#0a0a0a",
  outline: "none",
  background: "#fff",
};

const MAX_LOCAL = 15;
const DEBOUNCE_MS = 250;

// Extras search both the app's own small curated food list (instant, same
// as the primary protein/carb/fat pickers) and the ~1M-food USDA branded
// database (debounced server search) -- the two pools this app draws
// from: hand-picked whole foods for the solver's primary slots, and real
// store-bought packaged foods for anything logged as a fixed-quantity
// extra. Picking a remote result hands back the *whole* food object
// (name/p/c/f/servingSizeG) rather than an id, since branded foods aren't
// in the local foodLookup table the solver otherwise relies on.
export default function ExtraFoodSearch({ localList, value, onChange, onClear, placeholder }) {
  const selectedLocal = localList.find((f) => f.id === value?.food || f.id === value) || null;
  const [query, setQuery] = useState(selectedLocal ? selectedLocal.name : value?.name || "");
  const [open, setOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      reqIdRef.current++; // drop any in-flight results
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const myReqId = ++reqIdRef.current;
      setSearching(true);
      try {
        const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (myReqId === reqIdRef.current) setRemoteResults(data.results || []);
      } catch (e) {
        console.error("food search:", e);
      } finally {
        if (myReqId === reqIdRef.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const q = query.trim().toLowerCase();
  const localMatches = q ? localList.filter((f) => f.name.toLowerCase().includes(q)).slice(0, MAX_LOCAL) : [];

  const remoteMatches = q.length < 2 ? [] : remoteResults;

  const pickLocal = (food) => {
    // Carries its own macros too, so it fully replaces a branded pick's values.
    onChange({ food: food.id, name: food.name, p: food.p, c: food.c, f: food.f, servingSizeG: null, servingLabel: null });
    setQuery(food.name);
    setOpen(false);
  };

  const pickRemote = (food) => {
    onChange({
      food: food.id,
      name: food.name,
      p: food.p,
      c: food.c,
      f: food.f,
      servingSizeG: food.servingSizeG ?? null,
      servingLabel: food.servingLabel ?? null,
    });
    setQuery(food.name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? "Search foods, including branded…"}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onClear?.(); // typed text no longer matches the picked food
          setOpen(true);
        }}
        style={inputStyle}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#fff",
            border: "1.5px solid #e8e8e8",
            borderRadius: 10,
            maxHeight: 280,
            overflowY: "auto",
            zIndex: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          {localMatches.length === 0 && remoteMatches.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#bbb" }}>
              {searching ? "Searching…" : q ? "No matches" : "Type to search"}
            </div>
          )}

          {localMatches.length > 0 && (
            <>
              <div style={{ padding: "7px 12px 4px", fontSize: 10, fontWeight: 800, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Whole foods
              </div>
              {localMatches.map((f) => (
                <div key={f.id} onMouseDown={() => pickLocal(f)} style={resultRowStyle}>
                  {f.name}
                </div>
              ))}
            </>
          )}

          {remoteMatches.length > 0 && (
            <>
              <div style={{ padding: "7px 12px 4px", fontSize: 10, fontWeight: 800, color: "#bbb", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Branded &amp; packaged
              </div>
              {remoteMatches.map((f) => (
                <div key={f.id} onMouseDown={() => pickRemote(f)} style={resultRowStyle}>
                  <div>{f.name}</div>
                  {f.servingLabel && (
                    <div style={{ fontSize: 11, color: "#bbb", fontWeight: 600, marginTop: 2 }}>
                      {f.servingLabel}
                      {f.servingSizeG ? ` · ${Math.round(f.kcal * f.servingSizeG)} cal/serving` : ""}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const resultRowStyle = {
  padding: "9px 12px",
  fontSize: 13,
  fontWeight: 600,
  color: "#0a0a0a",
  cursor: "pointer",
  borderBottom: "1px solid #f5f5f5",
};
