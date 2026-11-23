"use client";

// Fixed tab bar below the header -- the one piece of chrome that's always
// visible and never scrolls, regardless of how long any tab's content gets.
export default function TabBar({ tabs, active, onChange }) {
  return (
    <nav
      style={{
        flexShrink: 0,
        display: "flex",
        borderBottom: "1.5px solid #e8e8e8",
        background: "#fff",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => !tab.disabled && onChange(tab.key)}
            disabled={tab.disabled}
            style={{
              flex: 1,
              padding: "10px 8px 12px",
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid #0a0a0a" : "2px solid transparent",
              marginBottom: -1.5,
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: tab.disabled ? "#ddd" : isActive ? "#0a0a0a" : "#aaa",
              cursor: tab.disabled ? "default" : "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
