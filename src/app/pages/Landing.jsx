import React from "react";

function SignInButton({ onSignIn }) {
  return (
    <button className="btn btn-google btn-lg" onClick={onSignIn}>
      <img
        className="gicon"
        alt=""
        src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png"
      />
      Sign in with Google
    </button>
  );
}

export default function Landing({ onSignIn }) {
  return (
    <>
      <header className="navbar">
        <div className="container" style={{ display: "flex", justifyContent: "space-between" }}>
          <strong>Habit Tracker</strong>
          <nav style={{ display: "flex", gap: 8 }}>
            <a className="btn btn-text" href="#features">Features</a>
            <a className="btn btn-text" href="#how">How it works</a>
            <SignInButton onSignIn={onSignIn} />
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <h1>Build habits you’ll actually keep</h1>
          <p className="muted">Simple streaks, time‑of‑day reminders, privacy‑friendly.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            <SignInButton onSignIn={onSignIn} />
            <a className="btn btn-tonal btn-lg" href="#features">See features</a>
          </div>
        </div>
      </section>

      <section id="features" className="container" style={{ padding: "48px 0" }}>
        <div className="card elev-1">
          <div className="card-header">Fast, minimal, Google‑sign‑in.</div>
          <p className="muted">This is a placeholder Feature section. Replace with reusable components later.</p>
        </div>
      </section>
    </>
  );
}
