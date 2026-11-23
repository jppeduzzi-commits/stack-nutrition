"use client";

// Bottom navigation, always visible.
export default function TabBar({ tabs, active, onChange }) {
  return (
    <nav style={{ flexShrink: 0, display: "flex", borderTop: "1.5px solid #e8e8e8", background: "#fff", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {tabs.map((tab) => {
        const on = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            aria-current={on ? "page" : undefined}
            style={{ flex: 1, padding: "15px 4px", background: "none", border: "none", borderTop: `2px solid ${on ? "#0a0a0a" : "transparent"}`, marginTop: -1.5, fontSize: 12, fontWeight: 800, color: on ? "#0a0a0a" : "#aaa", cursor: "pointer" }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
