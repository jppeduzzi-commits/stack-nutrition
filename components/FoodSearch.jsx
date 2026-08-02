"use client";

import { useEffect, useRef, useState } from "react";

const inputStyle = {
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

const MAX_RESULTS = 40;

export default function FoodSearch({ list, value, onChange, placeholder }) {
  const selected = list.find((f) => f.id === value) || null;
  const [query, setQuery] = useState(selected ? selected.name : "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Resync the displayed text when the selected id changes (e.g. a different
  // meal is selected), without wiping in-progress typing on unrelated
  // re-renders -- adjusted during render per React's "previous value" pattern
  // rather than an effect, since an effect here would fire on every render.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setQuery(selected ? selected.name : "");
  }

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(selected ? selected.name : "");
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, selected]);

  const q = query.trim().toLowerCase();
  const matches = (q ? list.filter((f) => f.name.toLowerCase().includes(q)) : list).slice(0, MAX_RESULTS);

  const pick = (food) => {
    onChange(food.id);
    setQuery(food.name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? "Search foods…"}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
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
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          {matches.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#bbb" }}>No matches</div>
          ) : (
            matches.map((f) => (
              <div
                key={f.id}
                onMouseDown={() => pick(f)}
                style={{
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0a0a0a",
                  cursor: "pointer",
                  borderBottom: "1px solid #f5f5f5",
                }}
              >
                {f.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
