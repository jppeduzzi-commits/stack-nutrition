"use client";

import { useState } from "react";
import { makePerson } from "@/lib/person";

const field = { width: "100%", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "12px 14px", fontSize: 16, fontWeight: 700, color: "#0a0a0a", outline: "none", background: "#fff", marginBottom: 10 };
const button = { width: "100%", padding: "14px 18px", background: "#0a0a0a", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer" };

// onCheck(person) → does a log already exist? onOpen(person) → go.
export default function NameScreen({ onCheck, onOpen }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [found, setFound] = useState(null); // { person, exists }, awaiting confirmation
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const person = makePerson(first, last);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setError("Couldn't connect. Check your connection and try again.");
    }
    setBusy(false);
  };
  const submit = (e) => {
    e.preventDefault();
    if (person && !busy) run(async () => setFound({ person, exists: await onCheck(person) }));
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 36 }}>STACK NUTRITION</div>
        {found ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, lineHeight: 1.5 }}>
              {found.exists
                ? `Found a food log for ${found.person.firstName} ${found.person.lastName}. Is that you?`
                : `No log yet for ${found.person.firstName} ${found.person.lastName}. Start a new one?`}
            </div>
            <button style={button} disabled={busy} onClick={() => run(() => onOpen(found.person))}>
              {busy ? "..." : found.exists ? "Yes, open my log" : "Start my log"}
            </button>
            <button style={{ ...button, background: "none", color: "#888", fontSize: 13 }} disabled={busy} onClick={() => setFound(null)}>
              Go back
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <div style={{ fontSize: 13, color: "#888", fontWeight: 600, marginBottom: 16 }}>What&rsquo;s your name?</div>
            <input style={field} value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" autoComplete="given-name" autoCorrect="off" />
            <input style={field} value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" autoComplete="family-name" autoCorrect="off" />
            <button type="submit" disabled={!person || busy} style={{ ...button, background: person ? "#0a0a0a" : "#e8e8e8", color: person ? "#fff" : "#bbb" }}>
              {busy ? "..." : "Continue →"}
            </button>
            <div style={{ fontSize: 11, color: "#bbb", fontWeight: 600, marginTop: 12, lineHeight: 1.5 }}>
              There&rsquo;s no password yet, so anyone who enters your name can see your log.
            </div>
          </form>
        )}
        {error && <div style={{ fontSize: 12, color: "#a4302a", fontWeight: 700, marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}
