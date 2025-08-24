import React from "react";
import FeatureCard from "./FeatureCard";

export default function FeatureGrid() {
  return (
    <section id="features" className="container" style={{ padding: "48px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Everything you need to stick with it</h2>
        <p className="muted">Fast, minimal, and designed for real life.</p>
      </div>
      <div
        className="gap"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
        }}
      >
        <FeatureCard icon="🔥" title="Streaks that motivate">
          Keep momentum with honest streaks (skips don’t auto‑break).
        </FeatureCard>
        <FeatureCard icon="⏰" title="Time‑of‑day slots">
          Morning, afternoon, night—set distinct reminders per habit.
        </FeatureCard>
        <FeatureCard icon="📈" title="Lightweight insights">
          See trends without the baggage. Export your data anytime.
        </FeatureCard>
        <FeatureCard icon="🔒" title="Privacy‑first">
          Minimal data, no tracking pixels. Your habits are yours.
        </FeatureCard>
      </div>
    </section>
  );
}
