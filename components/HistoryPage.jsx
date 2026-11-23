"use client";

import { dayEntries, dayTotals, formatKey } from "@/lib/log";
import { macroLine } from "./LogPage";

export default function HistoryPage({ days, today, onOpen }) {
  const list = Object.values(days)
    .filter((d) => d && dayEntries(d).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (list.length === 0) {
    return <div style={{ textAlign: "center", padding: "24px 20px", color: "#bbb", fontSize: 13 }}>Days you log will show up here.</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {list.map((d) => {
        const t = dayTotals(d);
        const goal = Math.round(d.targets?.calories || 0);
        return (
          <button key={d.date} onClick={() => onOpen(d.date)} style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 14, padding: 14, cursor: "pointer", color: "#0a0a0a" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{formatKey(d.date, today)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginTop: 2 }}>{macroLine(t)}</div>
            </div>
            {goal > 0 && <div style={{ fontSize: 12, fontWeight: 800 }}>{Math.round((t.kcal / goal) * 100)}% <span style={{ color: "#888", fontWeight: 600 }}>of {goal}</span></div>}
            <span style={{ color: "#ccc" }}>›</span>
          </button>
        );
      })}
    </div>
  );
}
