import React from "react";

export default function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: "var(--primary)",
          display: "inline-block",
          boxShadow: "0 0 0 2px color-mix(in srgb, var(--primary) 35%, transparent)"
        }}
      />
      Habit Tracker
    </div>
  );
}
