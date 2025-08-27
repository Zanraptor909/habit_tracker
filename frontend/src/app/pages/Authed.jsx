// src/app/pages/Authed.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useMemo as useMemo2,
} from "react";
import { useAuth } from "../authed/AuthProvider";
import userImg from "../../assets/user.png";

const API_BASE = process.env.REACT_APP_API_BASE ?? "";
const CHECKLIST_PATH = "/api/checklist/today";
const LOG_PATH = "/api/habit_log";
const HABITS_PATH = "/api/habits";
const STATS_PATH = "/api/stats/daily_completion";

const PERIODS = [
  { key: "MORNING", label: "Morning", icon: "☀️" },
  { key: "AFTERNOON", label: "Afternoon", icon: "🌤️" },
  { key: "NIGHT", label: "Night", icon: "🌙" },
];

// --- Local date helpers (avoid UTC parse drift) ---
const toISODateLocal = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const parseISODateLocal = (s) => {
  const [y, m, d] = (s || "").split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};

export default function Authed({ onSignOut }) {
  const { user } = useAuth(); // { id, email, name, image_url }
  const displayName = user?.name || user?.email || "Account";

  const todayISO = useMemo(() => toISODateLocal(new Date()), []);
  const [day, setDay] = useState(todayISO);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [postingId, setPostingId] = useState(null);

  // Add Habit form
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPeriod, setAddPeriod] = useState("MORNING");
  const [addTime, setAddTime] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState(null);
  const [addError, setAddError] = useState(null);

  // Streaks
  const [streakData, setStreakData] = useState([]); // [{date, completed, total, pct}]
  const [streakErr, setStreakErr] = useState(null);

  // ---- Fetch checklist for selected day ----
  const fetchChecklist = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setErr(null);
    try {
      const url = new URL(API_BASE + CHECKLIST_PATH, window.location.origin);
      url.searchParams.set("user_id", String(user.id));
      url.searchParams.set("day", day); // <<< tell backend which calendar day

      const r = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error((await r.text()) || `Failed ${r.status}`);

      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, day]);

  // ---- Fetch streaks (last 21 days) ----
  const fetchStreaks = useCallback(async () => {
    if (!user?.id) return;
    setStreakErr(null);
    try {
      const url = new URL(API_BASE + STATS_PATH, window.location.origin);
      url.searchParams.set("user_id", String(user.id));
      url.searchParams.set("days", "21");

      const r = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error((await r.text()) || `Failed ${r.status}`);

      const data = await r.json();
      const cleaned = (Array.isArray(data) ? data : []).map((d) => {
        const completed = Number(d?.completed ?? 0);
        const total = Number(d?.total ?? 0);
        const pct = total > 0 ? (d?.pct != null ? Number(d.pct) : completed / total) : 0;
        const date = String(d?.date ?? "");
        return { date, completed, total, pct: Number.isFinite(pct) ? pct : 0 };
      });
      setStreakData(cleaned);
    } catch (e) {
      setStreakErr("Could not load streak data.");
      setStreakData([]);
    }
  }, [user?.id]);

  // Load on mount & when day/user changes
  useEffect(() => {
    fetchChecklist();
    fetchStreaks();
  }, [fetchChecklist, fetchStreaks]);

  // ---- Mark done (NO optimistic toggle) ----
  const markDone = async (habit_id, period) => {
    setPostingId(habit_id);
    try {
      const res = await fetch(API_BASE + LOG_PATH, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habit_id,
          period,
          day, // bind completion to selected calendar day
          completed: true,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || `POST /habit_log failed`);

      // Pull fresh state for THIS day from the server
      await fetchChecklist();
      await fetchStreaks();
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
          period: addPeriod,
          local_time: addTime || null,
        }),
      });

      if (!res.ok) throw new Error((await res.text()) || `POST /api/habits failed`);

      setAddName("");
      setAddPeriod("MORNING");
      setAddTime("");
      setAddMsg("Habit created!");
      await fetchChecklist();
      await fetchStreaks();
    } catch (e) {
      setAddError(e.message || "Failed to create habit");
    } finally {
      setAddBusy(false);
    }
  };

  // ---- Day navigation (local calendar math) ----
  const shiftDay = (days) => {
    const d = parseISODateLocal(day);
    d.setDate(d.getDate() + days);
    setDay(toISODateLocal(d));
  };

  // ---- Group & sort items ----
  const grouped = useMemo2(() => {
    const byPeriod = { MORNING: [], AFTERNOON: [], NIGHT: [] };
    for (const it of items) {
      if (byPeriod[it.period]) byPeriod[it.period].push(it);
    }
    const sortFn = (a, b) => {
      const ta = a.local_time || "99:99";
      const tb = b.local_time || "99:99";
      if (ta !== tb) return ta.localeCompare(tb);
      return (a.name || "").localeCompare(b.name || "");
    };
    byPeriod.MORNING.sort(sortFn);
    byPeriod.AFTERNOON.sort(sortFn);
    byPeriod.NIGHT.sort(sortFn);
    return byPeriod;
  }, [items]);

  const renderSection = (periodKey, label, icon) => {
    const list = grouped[periodKey] || [];
    return (
      <div className="card elev-0" style={{ padding: 12 }}>
        <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
          <span style={{ fontWeight: 600 }}>{label}</span>
        </div>

        {list.length === 0 ? (
          <div className="muted" style={{ padding: "4px 0 8px" }}>
            Nothing scheduled for {label.toLowerCase()}.
          </div>
        ) : (
          <ul className="list">
            {list.map((it) => (
              <li
                key={`${it.habit_id}-${it.period}-${day}`} // include day to avoid React reuse across days
                className="list-item"
                style={{ display: "grid", gap: 6 }}
              >
                {/* Top row: name + inline button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <strong
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {it.name}
                    </strong>
                    {it.completed && (
                      <span className="chip" style={{ fontSize: 12, padding: "2px 6px" }}>
                        Done
                      </span>
                    )}
                  </div>

                  <button
                    className="btn btn-outline btn-sm"
                    style={{ whiteSpace: "nowrap" }}
                    disabled={it.completed || postingId === it.habit_id}
                    onClick={() => markDone(it.habit_id, it.period)}
                  >
                    {it.completed
                      ? "Done"
                      : postingId === it.habit_id
                      ? "Saving…"
                      : "Mark done"}
                  </button>
                </div>

                {/* Second row: meta */}
                <div className="muted" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span>{label}</span>
                  {it.local_time ? <span>• Reminder {it.local_time}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // ---- Streak heatmap helpers ----
  const maxPct = useMemo(() => {
    if (!streakData.length) return 1;
    return Math.max(...streakData.map((d) => d.pct ?? 0), 1);
  }, [streakData]);

  const cellColor = (pct) => {
    const intensity = Math.round(90 - Math.min(1, pct / (maxPct || 1)) * 60); // 90% -> 30%
    return `hsl(140 60% ${intensity}%)`;
  };

  return (
    <>
      <header className="navbar">
        <div className="container" style={{ display: "flex", justifyContent: "space-between" }}>
          <strong>Habit Tracker</strong>

          <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a className="btn btn-text" href="#today">Today</a>
            <a className="btn btn-text" href="#streaks">Streaks</a>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={userImg}
                alt="User"
                style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }}
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
        {/* ======= TODAY ======= */}
        <section id="today" className="card elev-1" style={{ marginBottom: 16 }}>
          <div
            className="card-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>Today’s Checklist</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-outline btn-sm" onClick={() => shiftDay(-1)} title="Previous day">
                ◀ Prev
              </button>
              <strong>{day}</strong>
              <button className="btn btn-outline btn-sm" onClick={() => shiftDay(+1)} title="Next day">
                Next ▶
              </button>
              {day !== todayISO && (
                <button className="btn btn-text btn-sm" onClick={() => setDay(todayISO)} title="Jump to today">
                  Today
                </button>
              )}
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
          </div>

          {/* Add Habit */}
          {showAdd && (
            <form
              onSubmit={onAddHabit}
              className="card elev-0"
              style={{ padding: 12, display: "grid", gap: 12, margin: "0 12px 12px" }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor="habit-name"><strong>Name</strong></label>
                <input
                  id="habit-name"
                  className="input"
                  placeholder="Brush Teeth"
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

          {/* Checklist body */}
          {loading ? (
            <div className="muted" style={{ padding: 12 }}>Loading…</div>
          ) : err ? (
            <div className="muted" style={{ color: "var(--error, #b00020)", padding: 12 }}>{err}</div>
          ) : (
            <div className="card elev-0" style={{ display: "grid", gap: 12, padding: 12 }}>
              {PERIODS.map((p) => (
                <div key={p.key}>{renderSection(p.key, p.label, p.icon)}</div>
              ))}
            </div>
          )}
        </section>

        {/* ======= STREAKS ======= */}
        <section id="streaks" className="card elev-1">
          <div className="card-header" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span role="img" aria-label="flame">🔥</span>
            <span>Streaks (last 21 days)</span>
          </div>

          {streakErr && (
            <div className="muted" style={{ padding: 12 }}>{streakErr}</div>
          )}

          <div style={{ padding: 12 }}>
            {streakData.length === 0 ? (
              <div className="muted">
                Do some habits and your heatmap will light up here.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(21, 16px)",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  {streakData.map((d) => (
                    <div
                      key={d.date}
                      title={`${d.date} — ${Math.round((d.pct || 0) * 100)}% (${d.completed}/${d.total})`}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: cellColor(d.pct || 0),
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)",
                      }}
                    />
                  ))}
                </div>

                <div
                  className="muted"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span>Less</span>
                  {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                    <span
                      key={p}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: cellColor(p),
                        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)",
                      }}
                    />
                  ))}
                  <span>More</span>
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
