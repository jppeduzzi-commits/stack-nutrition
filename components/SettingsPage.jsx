"use client";

import { useState } from "react";

const card = { background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 14, padding: 14 };
const label = { fontSize: 10, fontWeight: 800, color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 };
const button = { width: "100%", border: "1.5px solid #e8e8e8", background: "#fff", color: "#0a0a0a", borderRadius: 10, padding: "11px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer" };
const note = { fontSize: 12, fontWeight: 600, color: "#888", lineHeight: 1.5 };

// onDelete() removes everything and throws if it couldn't.
export default function SettingsPage({ person, onSwitch, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const fullName = `${person.firstName} ${person.lastName}`;
  const tidy = (s) => s.trim().replace(/\s+/g, " ").replace(/\u2019/g, "'").toLowerCase(); // iOS types curly apostrophes
  const matches = tidy(typed) === tidy(fullName);

  const remove = async () => {
    if (!matches || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await onDelete();
    } catch (e) {
      console.error(e);
      setError("Couldn't finish deleting. Some data may remain. Check your connection and try again.");
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <section style={card}>
        <div style={label}>Account</div>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 12 }}>{fullName}</div>
        <button style={button} onClick={onSwitch} disabled={deleting}>Switch person</button>
        <div style={{ ...note, marginTop: 8 }}>Your log stays saved. Enter your name again to reopen it.</div>
      </section>

      <section style={card}>
        <div style={label}>Delete account</div>
        {!confirming ? (
          <button style={{ ...button, color: "#a4302a" }} onClick={() => setConfirming(true)}>Delete account</button>
        ) : (
          <>
            <div style={{ ...note, color: "#a4302a", marginBottom: 10 }}>
              This permanently deletes {fullName}&rsquo;s targets, meals and entire food history, on every device. It can&rsquo;t be undone.
            </div>
            <div style={{ ...note, marginBottom: 6 }}>Type <b style={{ color: "#0a0a0a" }}>{fullName}</b> to confirm.</div>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label="Type your full name to confirm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={deleting}
              style={{ width: "100%", border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "10px 12px", fontSize: 16, fontWeight: 700, color: "#0a0a0a", background: "#fff", outline: "none", marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={button} disabled={deleting} onClick={() => { setConfirming(false); setTyped(""); setError(""); }}>Cancel</button>
              <button
                style={{ ...button, background: matches ? "#a4302a" : "#e8e8e8", borderColor: matches ? "#a4302a" : "#e8e8e8", color: matches ? "#fff" : "#bbb" }}
                disabled={!matches || deleting}
                onClick={remove}
              >
                {deleting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
            {error && <div style={{ ...note, color: "#a4302a", marginTop: 10 }}>{error}</div>}
          </>
        )}
      </section>

      <div style={{ ...note, fontSize: 11, color: "#bbb", textAlign: "center" }}>Food data from USDA FoodData Central, fdc.nal.usda.gov</div>
    </div>
  );
}
