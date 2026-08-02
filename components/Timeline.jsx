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

function toMinutes(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return h * 60 + m;
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

  const startMin = toMinutes(dayRange.start);
  const endMin = toMinutes(dayRange.end);
  const span = Math.max(endMin - startMin, 1);

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
          position: "relative",
          height: 44,
          background: "#f5f5f5",
          borderRadius: 10,
          border: "1px solid #e8e8e8",
          marginBottom: 20,
        }}
      >
        {meals.map((m) => {
          const pos = Math.min(Math.max(((toMinutes(m.time) - startMin) / span) * 100, 0), 100);
          const isSelected = m.id === selectedMealId;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              title={`${m.name} · ${m.time}`}
              style={{
                position: "absolute",
                left: `${pos}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: isSelected ? "#0a0a0a" : "#fff",
                border: `2px solid ${isSelected ? "#0a0a0a" : "#0a0a0a55"}`,
                cursor: "pointer",
                padding: 0,
              }}
            />
          );
        })}
      </div>

      {meals.length === 0 && (
        <div style={{ padding: "8px 0 16px", color: "#bbb", fontSize: 13, fontWeight: 600 }}>
          No meals yet &mdash; add one below.
        </div>
      )}

      {meals
        .slice()
        .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
        .map((m) => {
          const isSelected = m.id === selectedMealId;
          return (
            <div
              key={m.id}
              onClick={() => onSelect(m.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                marginBottom: 8,
                borderRadius: 12,
                border: `1.5px solid ${isSelected ? "#0a0a0a" : "#e8e8e8"}`,
                background: isSelected ? "#0a0a0a" : "#fff",
                cursor: "pointer",
              }}
            >
              <input
                type="text"
                value={m.name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate(m.id, { name: e.target.value })}
                style={{
                  ...inputStyle,
                  flex: 1,
                  minWidth: 0,
                  background: isSelected ? "#1a1a1a" : "#fff",
                  color: isSelected ? "#fff" : "#0a0a0a",
                  border: `1.5px solid ${isSelected ? "#333" : "#e8e8e8"}`,
                }}
              />
              <input
                type="time"
                value={m.time}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate(m.id, { time: e.target.value })}
                style={{
                  ...inputStyle,
                  background: isSelected ? "#1a1a1a" : "#fff",
                  color: isSelected ? "#fff" : "#0a0a0a",
                  border: `1.5px solid ${isSelected ? "#333" : "#e8e8e8"}`,
                }}
              />
              <input
                type="number"
                value={m.pctOfDay}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate(m.id, { pctOfDay: e.target.value === "" ? "" : Number(e.target.value) })}
                style={{
                  ...inputStyle,
                  width: 64,
                  background: isSelected ? "#1a1a1a" : "#fff",
                  color: isSelected ? "#fff" : "#0a0a0a",
                  border: `1.5px solid ${isSelected ? "#333" : "#e8e8e8"}`,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#bbb" : "#888" }}>%</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(m.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: isSelected ? "#bbb" : "#bbb",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >
                &times;
              </button>
            </div>
          );
        })}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <button
          onClick={onAdd}
          style={{
            background: "#fff",
            border: "1.5px solid #e8e8e8",
            borderRadius: 20,
            padding: "9px 16px",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          + Add meal
        </button>
        <div style={{ fontSize: 12, fontWeight: 800, color: pctOk ? "#10B981" : "#E4574C" }}>
          {Math.round(pctTotal * 10) / 10}% of day {pctOk ? "✓" : "(needs to total 100%)"}
        </div>
      </div>
    </section>
  );
}
