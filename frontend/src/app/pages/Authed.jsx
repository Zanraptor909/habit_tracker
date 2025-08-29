// src/app/pages/Authed.jsx
import React from "react";
import { useAuth } from "../authed/AuthProvider";
import ChecklistPanel from "../components/ChecklistPanel";
import StreaksPanel from "../components/StreaksPanel";

const API_BASE = process.env.REACT_APP_API_BASE ?? "";

export default function Authed({ onSignOut }) {
  const { user } = useAuth(); // { id, email, name, image_url }

  return (
    <>

      <main className="container" style={{ padding: "32px 0" }}>
        {/* ======= CHECKLIST (reusable) ======= */}
        <ChecklistPanel
          userId={user?.id}
          apiBase={API_BASE}
          // title="Today’s Checklist"              // optional override
          // defaultDay="2025-08-27"               // optional start date
          // checklistPath="/api/checklist/today"  // optional override
          // logPath="/api/habit_log"              // optional override
          // habitsPath="/api/habits"              // optional override
        />

        {/* ======= STREAKS (reusable) ======= */}
        <div id="streaks" style={{ marginTop: 16 }}>
          <StreaksPanel
            userId={user?.id}
            apiBase={API_BASE}
            days={21}
            // title="Streaks (last 21 days)"       // optional override
            // statsPath="/api/stats/daily_completion" // optional override
          />
        </div>
      </main>
    </>
  );
}
