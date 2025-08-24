import React from "react";

export default function FeatureCard({ icon, title, children }) {
  return (
    <div className="card elev-1 round-lg" style={{ height: "100%" }}>
      <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }} aria-hidden>{icon}</span>
        {title}
      </div>
      <div className="muted">{children}</div>
    </div>
  );
}
