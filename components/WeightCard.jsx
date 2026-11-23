"use client";

import { useState } from "react";
import { formatKey } from "@/lib/log";
import { fmtChange, fmtLb, weightTrend } from "@/lib/weight";

const card = { background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 14, padding: 14 };
const label = { fontSize: 10, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" };
const input = { border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "7px 8px", fontSize: 16, fontWeight: 700, color: "#0a0a0a", background: "#fff", outline: "none", minWidth: 0 };
const pill = { border: "1.5px solid #e8e8e8", background: "#fff", borderRadius: 16, padding: "6px 12px", fontSize: 12, fontWeight: 800, color: "#0a0a0a", cursor: "pointer" };
const SHORT = 3;

export default function WeightCard({ weights, today, onSave, onDelete }) {
  const [date, setDate] = useState(null); // null = today, even after midnight
  const [lb, setLb] = useState("");
  const [all, setAll] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const dates = Object.keys(weights).sort().reverse();
  const { avg, change } = weightTrend(weights, today);
  const day = date || today;
  const n = Math.round(Number(lb) * 10) / 10;
  const valid = n > 0 && n < 1500 && day <= today;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSave(day, n);
    setLb("");
    setDate(null);
  };

  return (
    <section style={card}>
      <div style={{ ...label, marginBottom: 10 }}>Weight</div>
      {avg !== null && (
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 900 }}>{fmtLb(avg)}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#888" }}> lb · 7-day average</span>
          {change !== null && <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginTop: 2 }}>{fmtChange(change)} from the week before</div>}
        </div>
      )}
      <form noValidate onSubmit={submit} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input type="date" aria-label="Weigh-in date" value={day} max={today} onChange={(e) => setDate(e.target.value || null)} style={{ ...input, flex: 1 }} />
        <input type="number" inputMode="decimal" step="any" min="0" aria-label="Weight in pounds" placeholder="lb" value={lb} onChange={(e) => setLb(e.target.value)} style={{ ...input, width: 78 }} />
        <button type="submit" disabled={!valid} style={{ ...pill, background: "#0a0a0a", borderColor: "#0a0a0a", color: "#fff", opacity: valid ? 1 : 0.3 }}>
          {weights[day] ? "Update" : "Add"}
        </button>
      </form>
      {dates.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {(all ? dates : dates.slice(0, SHORT)).map((d) => (
            <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #f0f0f0", padding: "7px 0", fontSize: 13, fontWeight: 700 }}>
              <span style={{ flex: 1, color: "#888" }}>{formatKey(d, today)}</span>
              <span>{fmtLb(weights[d])} lb</span>
              {confirming === d ? (
                <>
                  <button style={{ ...pill, color: "#a4302a" }} onClick={() => { setConfirming(null); onDelete(d); }}>Delete</button>
                  <button style={pill} onClick={() => setConfirming(null)}>Keep</button>
                </>
              ) : (
                <button aria-label={`Delete weight for ${formatKey(d, today)}`} onClick={() => setConfirming(d)} style={{ background: "none", border: "none", color: "#bbb", fontSize: 18, padding: "0 8px", cursor: "pointer" }}>×</button>
              )}
            </div>
          ))}
          {dates.length > SHORT && (
            <button onClick={() => setAll(!all)} style={{ ...pill, marginTop: 6 }}>{all ? "Show less" : `Show all ${dates.length}`}</button>
          )}
        </div>
      )}
    </section>
  );
}
