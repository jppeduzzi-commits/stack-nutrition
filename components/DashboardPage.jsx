"use client";

import { useState } from "react";
import { dayTotals, parseKey, shiftKey } from "@/lib/log";
import { weekRecap, weekStart } from "@/lib/recap";
import { fmtChange, fmtLb, weightTrend } from "@/lib/weight";
import MacroSummary from "./MacroSummary";
import WeightCard from "./WeightCard";
import HistoryPage from "./HistoryPage";

const card = { background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 14, padding: 14 };
const label = { fontSize: 10, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" };
const arrow = { border: "1.5px solid #e8e8e8", background: "#fff", borderRadius: 16, padding: "4px 12px", fontSize: 14, fontWeight: 800, color: "#0a0a0a", cursor: "pointer" };
const DAY = { met: ["#0a0a0a", "#fff", "✓"], off: ["#fff", "#0a0a0a", "–"], missed: ["#f5f5f5", "#bbb", ""], notarget: ["#f5f5f5", "#bbb", "?"], today: ["#fff", "#888", "•"], future: ["#fff", "#ddd", ""] };
const short = (key) => parseKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function DashboardPage({ weights, onSaveWeight, onDeleteWeight, days, today, targets, onOpenDay, onSetTargets }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={label}>Today</div>
      <MacroSummary totals={dayTotals(days[today])} targets={targets} />
      {!(targets.calories > 0) && (
        <button onClick={onSetTargets} style={{ ...card, fontSize: 13, fontWeight: 800, cursor: "pointer", color: "#0a0a0a" }}>Set your daily targets on Strategy →</button>
      )}
      <WeightCard weights={weights} today={today} onSave={onSaveWeight} onDelete={onDeleteWeight} />
      <WeeklyRecap weights={weights} days={days} today={today} onOpenDay={onOpenDay} />
      <div style={{ ...label, marginTop: 8 }}>History</div>
      <HistoryPage days={days} today={today} onOpen={onOpenDay} />
    </div>
  );
}

function WeeklyRecap({ weights, days, today, onOpenDay }) {
  const thisWeek = weekStart(today);
  const [start, setStart] = useState(thisWeek);
  const first = weekStart([...Object.keys(days).filter((k) => days[k]), ...Object.keys(weights)].sort()[0] || today);
  const w = weekRecap(days, start, today);
  const weight = weightTrend(weights, start === thisWeek ? today : w.end);
  const isCurrent = start === thisWeek;

  return (
    <section style={card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button aria-label="Previous week" style={{ ...arrow, opacity: start <= first ? 0.3 : 1 }} disabled={start <= first} onClick={() => setStart(shiftKey(start, -7))}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={label}>Weekly recap</div>
          <div style={{ fontSize: 14, fontWeight: 900, marginTop: 2 }}>{isCurrent ? "This week" : `${short(w.start)} – ${short(w.end)}`}</div>
        </div>
        <button aria-label="Next week" style={{ ...arrow, opacity: start >= thisWeek ? 0.3 : 1 }} disabled={start >= thisWeek} onClick={() => setStart(shiftKey(start, 7))}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginBottom: 14 }}>
        {w.days.map((d) => {
          const [bg, fg, mark] = DAY[d.status];
          return (
            <button key={d.date} disabled={d.status === "future"} onClick={() => onOpenDay(d.date)} aria-label={`${short(d.date)} ${d.status}`}
              style={{ border: "1.5px solid #e8e8e8", borderRadius: 8, background: bg, color: fg, padding: "6px 0", cursor: "pointer" }}>
              <div style={{ fontSize: 10, fontWeight: 700 }}>{"MTWTFSS"[w.days.indexOf(d)]}</div>
              <div style={{ fontSize: 13, fontWeight: 900, height: 17 }}>{mark}</div>
            </button>
          );
        })}
      </div>

      {w.counted === 0 ? (
        <div style={{ fontSize: 13, fontWeight: 600, color: "#888" }}>
          {isCurrent ? "Your recap starts once you've finished a logged day with targets set." : "No days with targets were logged this week."}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 17, fontWeight: 900 }}>{w.goalsMet} of {w.goalsTotal} goals {w.finished ? "met" : "on track"}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8 }}>
            Average of {w.counted} logged day{w.counted === 1 ? "" : "s"}{w.finished && w.counted < 4 ? ". Not many days, so take this loosely." : ""}
          </div>
          {w.goals.filter((g) => g.met !== null).map((g) => (
            <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid #f0f0f0", padding: "8px 0" }}>
              <div style={{ width: 20, fontSize: 15, fontWeight: 900, color: g.met ? "#10B981" : "#bbb" }}>{g.met ? "✓" : "–"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{g.name}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>{g.daysMet} of {g.daysCounted} days on target</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{Math.round(g.actual)}<span style={{ color: "#888", fontWeight: 600 }}> / {Math.round(g.goal)}{g.unit}</span></div>
            </div>
          ))}
        </>
      )}
      {weight.avg !== null && (
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0f0", padding: "8px 0", marginTop: w.counted ? 0 : 10, fontSize: 13, fontWeight: 800 }}>
          <span>Average weight</span>
          <span>{fmtLb(weight.avg)} lb{weight.change !== null && <span style={{ color: "#888", fontWeight: 600 }}> · {fmtChange(weight.change)}</span>}</span>
        </div>
      )}
      <div style={{ fontSize: 10, fontWeight: 600, color: "#bbb", marginTop: 8, lineHeight: 1.5 }}>
        ✓ on a day = calories within 10%. Protein counts at 90% or more. Today and unlogged days aren&rsquo;t counted.
      </div>
    </section>
  );
}
