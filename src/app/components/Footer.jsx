import React from "react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="container" style={{ padding: "24px 0", color: "var(--text-subtle)" }}>
      <div className="divider" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Logo />
        <small>© {new Date().getFullYear()} Habit Tracker</small>
      </div>
    </footer>
  );
}
