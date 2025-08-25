// src/app/pages/Authed.jsx
import React from "react";
import { useAuth } from "../authed/AuthProvider";
import userImg from "../../assets/user.png"; // static image

export default function Authed({ onSignOut }) {
  const { user } = useAuth(); // { id, email, name, image_url }
  const displayName = user?.name || user?.email || "Account";

  return (
    <>
      <header className="navbar">
        <div
          className="container"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <strong>Habit Tracker</strong>

          <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a className="btn btn-text" href="#today">
              Today
            </a>
            <a className="btn btn-text" href="#habits">
              My Habits
            </a>

            {/* Always show the same static image */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={userImg}
                alt="User"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8, // rounded square edges
                  objectFit: "cover",
                }}
              />
              <span
                className="muted"
                title={displayName}
                style={{
                  maxWidth: 160,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </span>
            </div>

            <button className="btn btn-tonal" onClick={onSignOut}>
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="container" style={{ padding: "32px 0" }}>
        <section
          id="today"
          className="card elev-1"
          style={{ marginBottom: 16 }}
        >
          <div className="card-header">Today’s Checklist</div>
          <ul className="list">
            <li className="list-item">
              <div>
                <strong>Drink Water</strong>
                <div className="muted">MORNING • Reminder 8:00 AM</div>
              </div>
              <button className="btn btn-outline btn-sm">Mark done</button>
            </li>
            <li className="list-item">
              <div>
                <strong>Read 10 minutes</strong>
                <div className="muted">NIGHT • Reminder 9:00 PM</div>
              </div>
              <button className="btn btn-outline btn-sm">Mark done</button>
            </li>
          </ul>
        </section>

        <section id="habits" className="card elev-1">
          <div className="card-header">My Habits</div>
          <div className="muted">
            This is placeholder content. Next step: fetch from your API and wire
            “Mark done” to POST /habit_log.
          </div>
        </section>
      </main>
    </>
  );
}
