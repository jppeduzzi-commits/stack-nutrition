"use client";

import { MACRO_COLORS, MACRO_LABELS } from "@/lib/constants";

export default function MacroBadge({ macro, children }) {
  const color = MACRO_COLORS[macro];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: `${color}1a`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 20,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {children ?? MACRO_LABELS[macro]}
    </span>
  );
}
