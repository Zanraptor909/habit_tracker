import React from "react";
import SignInButton from "./SignInButton";

export default function CTA({ onSignIn }) {
  return (
    <section className="container" style={{ padding: "40px 0" }}>
      <div className="card elev-2" style={{ display: "grid", gap: 16, textAlign: "center" }}>
        <h3 style={{ margin: 0 }}>Ready to build the habit?</h3>
        <p className="muted" style={{ margin: 0 }}>
          Sign in with Google and start tracking in under 10 seconds.
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SignInButton onSignIn={onSignIn} size="lg" />
        </div>
      </div>
    </section>
  );
}
