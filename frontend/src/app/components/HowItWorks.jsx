import React from "react";

export default function HowItWorks() {
  return (
    <section id="how" className="container" style={{ padding: "32px 0" }}>
      <div className="card card-subtle elev-1">
        <div className="card-header">How it works</div>
        <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.75 }}>
          <li>Create or sign in with Google.</li>
          <li>Add a habit and pick its times (morning/afternoon/night).</li>
          <li>Tap once to mark done—your streak updates instantly.</li>
          <li>Skim insights to tune cadence; export whenever you want.</li>
        </ol>
      </div>
    </section>
  );
}
