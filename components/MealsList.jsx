"use client";

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
  border: "1.5px solid #e8e8e8",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 13,
  fontWeight: 700,
  color: "#0a0a0a",
  outline: "none",
};

const MIN_MEALS = 1;
const MAX_MEALS = 8;

// Replaces a time-of-day schedule: pick a standard number of meals for the
// day and it stays that way (no clock times, no scrolling to find a slot).
// Each meal still gets a % of the day's macros -- same solver math as
// before, just without the timeline UI around it.
export default function MealsList({ meals, onMealCountChange, selectedMealId, onSelect, onUpdate }) {
  const pctTotal = meals.reduce((s, m) => s + Number(m.pctOfDay || 0), 0);
  const pctOk = Math.abs(pctTotal - 100) < 0.05;

  return (
    <section style={card}>
      <div style={sectionLabel}>Meals per day</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {Array.from({ length: MAX_MEALS - MIN_MEALS + 1 }, (_, i) => i + MIN_MEALS).map((n) => (
          <button
            key={n}
            onClick={() => onMealCountChange(n)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: meals.length === n ? "#0a0a0a" : "#f5f5f5",
              color: meals.length === n ? "#fff" : "#0a0a0a",
              border: `1.5px solid ${meals.length === n ? "#0a0a0a" : "#e8e8e8"}`,
              fontSize: 17,
              fontWeight: 800,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <div style={sectionLabel}>Your meals</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {meals.map((m) => (
          <MealRow
            key={m.id}
            meal={m}
            selected={m.id === selectedMealId}
            onSelect={() => onSelect(m.id)}
            onUpdate={(patch) => onUpdate(m.id, patch)}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: pctOk ? "#10B981" : "#E4574C" }}>
          {Math.round(pctTotal * 10) / 10}% of day {pctOk ? "✓" : "(needs to total 100%)"}
        </div>
      </div>
    </section>
  );
}

function MealRow({ meal, selected, onSelect, onUpdate }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 14px",
        borderRadius: 12,
        border: `1.5px solid ${selected ? "#0a0a0a" : "#e8e8e8"}`,
        background: selected ? "#0a0a0a" : "#fafafa",
        cursor: "pointer",
      }}
    >
      <input
        type="text"
        value={meal.name}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUpdate({ name: e.target.value })}
        style={{
          ...inputStyle,
          flex: 1,
          minWidth: 0,
          background: selected ? "#1a1a1a" : "#fff",
          color: selected ? "#fff" : "#0a0a0a",
          border: `1.5px solid ${selected ? "#333" : "#e8e8e8"}`,
        }}
      />
      <input
        type="number"
        value={meal.pctOfDay}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onUpdate({ pctOfDay: e.target.value === "" ? "" : Number(e.target.value) })}
        style={{
          ...inputStyle,
          width: 60,
          background: selected ? "#1a1a1a" : "#fff",
          color: selected ? "#fff" : "#0a0a0a",
          border: `1.5px solid ${selected ? "#333" : "#e8e8e8"}`,
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 700, color: selected ? "#bbb" : "#888" }}>%</span>
      <span style={{ fontSize: 18, color: selected ? "#fff" : "#ccc", lineHeight: 1 }}>&rsaquo;</span>
    </div>
  );
}
