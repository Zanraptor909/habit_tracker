// src/app/components/ChecklistPanel.jsx
import React, { useCallback, useEffect, useMemo, useState, useMemo as useMemo2 } from "react";

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

export default function ChecklistPanel({
  userId,
  apiBase = "",
  title = "Today’s Checklist",
  defaultDay,                                // optional: ISO date; defaults to today
  checklistPath = "/api/checklist/today",
  logPath = "/api/habit_log",
  habitsPath = "/api/habits",
}) {
  const todayISO = useMemo(() => toISODateLocal(new Date()), []);
  const [day, setDay] = useState(defaultDay || todayISO);

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

  // ---- Fetch checklist for selected day ----
  const fetchChecklist = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setErr(null);
    try {
      const url = new URL(apiBase + checklistPath, window.location.origin);
      url.searchParams.set("user_id", String(userId));
      url.searchParams.set("day", day); // bind to selected calendar day

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
  }, [userId, apiBase, checklistPath, day]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // ---- Mark done (NO optimistic toggle) ----
  const markDone = async (habit_id, period) => {
    setPostingId(habit_id);
    try {
      const res = await fetch(apiBase + logPath, {
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
      if (!res.ok) throw new Error((await res.text()) || `POST ${logPath} failed`);

      // Pull fresh state for THIS day from the server
      await fetchChecklist();
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
      const res = await fetch(apiBase + habitsPath, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name,
          period: addPeriod,
          local_time: addTime || null,
        }),
      });

      if (!res.ok) throw new Error((await res.text()) || `POST ${habitsPath} failed`);

      setAddName("");
      setAddPeriod("MORNING");
      setAddTime("");
      setAddMsg("Habit created!");
      await fetchChecklist();
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

  return (
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
        <span>{title}</span>
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
  );
}
