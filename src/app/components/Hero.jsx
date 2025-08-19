import React from "react";
import SignInButton from "./SignInButton";

export default function Hero({ onSignIn }) {
  return (
    <section className="hero">
      <div className="container">
        <h1>Build habits you’ll actually keep</h1>
        <p className="muted">
          Simple streaks, time‑of‑day reminders, and privacy‑friendly analytics.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
          <SignInButton onSignIn={onSignIn} size="lg" />
          <a className="btn btn-tonal btn-lg" href="#features">See features</a>
        </div>
      </div>
    </section>
  );
}
