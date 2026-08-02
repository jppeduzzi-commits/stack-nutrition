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

const SLOT_STEP_MINUTES = 30;
const ROW_HEIGHT = 52;

function toMinutes(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatLabel(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function buildSlots(startStr, endStr, stepMinutes) {
  const start = toMinutes(startStr);
  const end = toMinutes(endStr);
  const slots = [];
  for (let m = start; m <= end; m += stepMinutes) slots.push(minutesToTime(m));
  return slots;
}

export default function Timeline({
  meals,
  dayRange,
  onRangeChange,
  selectedMealId,
  onAdd,
  onSelect,
  onUpdate,
  onRemove,
}) {
  const pctTotal = meals.reduce((s, m) => s + Number(m.pctOfDay || 0), 0);
  const pctOk = Math.abs(pctTotal - 100) < 0.05;

  const slots = buildSlots(dayRange.start, dayRange.end, SLOT_STEP_MINUTES);
  const slotMinutes = slots.map(toMinutes);

  const mealsForSlot = (i) => {
    const lo = slotMinutes[i];
    const hi = i + 1 < slotMinutes.length ? slotMinutes[i + 1] : Infinity;
    return meals.filter((m) => {
      const t = toMinutes(m.time);
      return t >= lo && t < hi;
    });
  };

  return (
    <section style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={sectionLabel}>Timeline</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="time"
            value={dayRange.start}
            onChange={(e) => onRangeChange({ ...dayRange, start: e.target.value })}
            style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }}
          />
          <span style={{ color: "#bbb", fontSize: 12, fontWeight: 700 }}>&ndash;</span>
          <input
            type="time"
            value={dayRange.end}
            onChange={(e) => onRangeChange({ ...dayRange, end: e.target.value })}
            style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }}
          />
        </div>
      </div>

      <div
        style={{
          maxHeight: 480,
          overflowY: "auto",
          border: "1px solid #e8e8e8",
          borderRadius: 12,
        }}
      >
        {slots.map((slotTime, i) => {
          const slotMeals = mealsForSlot(i);
          return (
            <div
              key={slotTime}
              style={{
                display: "flex",
                alignItems: "stretch",
                minHeight: ROW_HEIGHT,
                borderBottom: i < slots.length - 1 ? "1px solid #f0f0f0" : "none",
              }}
            >
              <div
                style={{
                  width: 84,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#bbb",
                }}
              >
                {formatLabel(slotTime)}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, padding: "6px 8px 6px 0" }}>
                {slotMeals.map((m) => (
                  <MealCard
                    key={m.id}
                    meal={m}
                    selected={m.id === selectedMealId}
                    onSelect={() => onSelect(m.id)}
                    onUpdate={(patch) => onUpdate(m.id, patch)}
                    onRemove={() => onRemove(m.id)}
                  />
                ))}
                <button
                  onClick={() => onAdd(slotTime)}
                  style={{
                    height: slotMeals.length ? 24 : "100%",
                    minHeight: slotMeals.length ? 24 : ROW_HEIGHT - 12,
                    border: "1.5px dashed #e8e8e8",
                    borderRadius: 10,
                    background: "none",
                    color: "#ccc",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: pctOk ? "#10B981" : "#E4574C" }}>
          {Math.round(pctTotal * 10) / 10}% of day {pctOk ? "✓" : "(needs to total 100%)"}
        </div>
      </div>
    </section>
  );
}

function MealCard({ meal, selected, onSelect, onUpdate, onRemove }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 10,
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
          padding: "6px 8px",
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
          width: 56,
          padding: "6px 8px",
          background: selected ? "#1a1a1a" : "#fff",
          color: selected ? "#fff" : "#0a0a0a",
          border: `1.5px solid ${selected ? "#333" : "#e8e8e8"}`,
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 700, color: selected ? "#bbb" : "#888" }}>%</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          background: "none",
          border: "none",
          color: selected ? "#bbb" : "#bbb",
          fontSize: 16,
          cursor: "pointer",
          padding: "0 2px",
        }}
      >
        &times;
      </button>
    </div>
  );
}
