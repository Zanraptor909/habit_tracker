// src/app/pages/Authed.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../authed/AuthProvider";
import userImg from "../../assets/user.png";

const API_BASE = process.env.REACT_APP_API_BASE ?? "";
const CHECKLIST_PATH = "/api/checklist/today";
const LOG_PATH = "/api/habit_log";
const HABITS_PATH = "/api/habits"; // <-- create habit here

export default function Authed({ onSignOut }) {
  const { user } = useAuth(); // { id, email, name, image_url }
  const displayName = user?.name || user?.email || "Account";
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [postingId, setPostingId] = useState(null);

  // --- Add Habit form state ---
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPeriod, setAddPeriod] = useState("MORNING");
  const [addTime, setAddTime] = useState(""); // "08:00"
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState(null);
  const [addError, setAddError] = useState(null);

  // ---- Fetch today's checklist for this user ----
  useEffect(() => {
    if (!user?.id) return;
    let abort = false;
    setLoading(true);
    setErr(null);

    const url = new URL(API_BASE + CHECKLIST_PATH, window.location.origin);
    url.searchParams.set("user_id", String(user.id));

    fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.text()) || `Failed ${r.status}`);
        return r.json();
      })
      .then((data) => !abort && setItems(Array.isArray(data) ? data : []))
      .catch((e) => !abort && setErr(e.message || "Failed to load"))
      .finally(() => !abort && setLoading(false));

    return () => {
      abort = true;
    };
  }, [user?.id]);

  // ---- Mark done handler (optimistic) ----
  const markDone = async (habit_id, period) => {
    setPostingId(habit_id);
    setItems((prev) =>
      prev.map((it) =>
        it.habit_id === habit_id && it.period === period
          ? { ...it, completed: true }
          : it
      )
    );

    try {
      const res = await fetch(API_BASE + LOG_PATH, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habit_id,
          period,
          day: todayISO,
          completed: true,
        }),
      });
      if (!res.ok) {
        setItems((prev) =>
          prev.map((it) =>
            it.habit_id === habit_id && it.period === period
              ? { ...it, completed: false }
              : it
          )
        );
        throw new Error((await res.text()) || `POST /habit_log failed`);
      }
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to mark done");
    } finally {
      setPostingId(null);
    }
  };

  // ---- Create habit ----
  const onAddHabit = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddMsg(null);

    const name = addName.trim();
    if (!name) {
      setAddError("Please enter a habit name.");
      return;
    }

    setAddBusy(true);
    try {
      const res = await fetch(API_BASE + HABITS_PATH, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          name,
          period: addPeriod,       // 'MORNING' | 'AFTERNOON' | 'NIGHT' | etc.
          local_time: addTime || null, // optional "HH:MM"
        }),
      });

      if (!res.ok) {
        throw new Error((await res.text()) || `POST /api/habits failed`);
      }

      // Reset form + confirm message
      setAddName("");
      setAddPeriod("MORNING");
      setAddTime("");
      setAddMsg("Habit created! It will appear in Today when scheduled.");
      // Optional: refresh today's checklist immediately
      // You might re-run the same fetch here to include it if relevant to today.
    } catch (e) {
      setAddError(e.message || "Failed to create habit");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <>
      <header className="navbar">
        <div
          className="container"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <strong>Habit Tracker</strong>

          <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a className="btn btn-text" href="#today">Today</a>
            <a className="btn btn-text" href="#habits">My Habits</a>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={userImg}
                alt="User"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
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
        {/* ==================== TODAY ==================== */}
        <section id="today" className="card elev-1" style={{ marginBottom: 16 }}>
          <div className="card-header">Today’s Checklist</div>

          {loading ? (
            <div className="muted">Loading…</div>
          ) : err ? (
            <div className="muted" style={{ color: "var(--error, #b00020)" }}>
              {err}
            </div>
          ) : items.length === 0 ? (
            <div className="muted">Nothing left for today 🎉</div>
          ) : (
            <ul className="list">
              {items.map((it) => (
                <li key={`${it.habit_id}-${it.period}`} className="list-item">
                  <div>
                    <strong>{it.name}</strong>
                    <div className="muted">
                      {it.period}
                      {it.local_time ? ` • Reminder ${it.local_time}` : ""}
                      {it.completed ? " • Completed" : ""}
                    </div>
                  </div>

                  <button
                    className="btn btn-outline btn-sm"
                    disabled={it.completed || postingId === it.habit_id}
                    onClick={() => markDone(it.habit_id, it.period)}
                  >
                    {it.completed
                      ? "Done"
                      : postingId === it.habit_id
                      ? "Saving…"
                      : "Mark done"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ==================== MY HABITS ==================== */}
        <section id="habits" className="card elev-1">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>My Habits</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setShowAdd((s) => !s);
                setAddMsg(null);
                setAddError(null);
              }}
            >
              {showAdd ? "Close" : "Add habit"}
            </button>
          </div>

          {!showAdd ? (
            <div className="muted">
              Add a new habit to your schedule. You’ll see it in Today when it matches the selected period and time.
            </div>
          ) : (
            <form onSubmit={onAddHabit} className="card elev-0" style={{ padding: 12, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="habit-name"><strong>Name</strong></label>
                <input
                  id="habit-name"
                  className="input"
                  placeholder="Drink Water"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="habit-period"><strong>Period</strong></label>
                <select
                  id="habit-period"
                  className="input"
                  value={addPeriod}
                  onChange={(e) => setAddPeriod(e.target.value)}
                >
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="NIGHT">Night</option>
                </select>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="habit-time">
                  <strong>Reminder time</strong> <span className="muted">(optional)</span>
                </label>
                <input
                  id="habit-time"
                  type="time"
                  className="input"
                  value={addTime}
                  onChange={(e) => setAddTime(e.target.value)}
                />
              </div>

              {addError && (
                <div className="muted" style={{ color: "var(--error, #b00020)" }}>
                  {addError}
                </div>
              )}
              {addMsg && (
                <div className="muted" style={{ color: "var(--success, #0a7d29)" }}>
                  {addMsg}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" type="submit" disabled={addBusy}>
                  {addBusy ? "Saving…" : "Save habit"}
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setAddMsg(null);
                    setAddError(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
