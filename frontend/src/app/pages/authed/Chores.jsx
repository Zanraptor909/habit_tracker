import React, { useEffect, useMemo, useState } from "react";

/**
 * Chores Board — 3 panes:
 *  - Left: Master chore list (Daily / Weekly / Monthly)
 *  - Middle: Today's Plan (drop chores here to plan them)
 *  - Right: Completed Today (grouped by category)
 *
 * Drag sources: items in Master list and Plan
 * Drop targets: Plan (middle), Master (left, to remove from plan), Completed (right)
 *
 * When dropped into Completed:
 *  - The chore's lastCompleted updates to today
 *  - It's removed from Today's Plan (if present)
 *  - It shows up in Completed Today
 *
 * Data is persisted in localStorage under "chores_state_v1"
 */

const CATEGORIES = [
  { key: "DAILY", label: "Daily", cadenceDays: 1, icon: "☀️" },
  { key: "WEEKLY", label: "Weekly", cadenceDays: 7, icon: "🗓️" },
  { key: "MONTHLY", label: "Monthly", cadenceDays: 30, icon: "📅" },
];

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const daysBetween = (fromISO, toISO) => {
  try {
    const a = new Date(fromISO + "T00:00:00");
    const b = new Date(toISO + "T00:00:00");
    const ms = b - a;
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

const defaultChores = () => {
  const t = todayISO();
  // Prefilled suggestions — tweak as you like
  return [
    // DAILY
    { id: "d1", title: "Make bed", category: "DAILY", lastCompleted: t },
    { id: "d2", title: "Dishes / load dishwasher", category: "DAILY", lastCompleted: t },
    { id: "d3", title: "Wipe kitchen counters", category: "DAILY", lastCompleted: t },
    { id: "d4", title: "Tidy living room (10 min)", category: "DAILY", lastCompleted: t },
    { id: "d5", title: "Laundry pickup/fold small batch", category: "DAILY", lastCompleted: t },

    // WEEKLY
    { id: "w1", title: "Vacuum floors", category: "WEEKLY", lastCompleted: shiftDays(t, -5) },
    { id: "w2", title: "Mop kitchen/bath", category: "WEEKLY", lastCompleted: shiftDays(t, -9) },
    { id: "w3", title: "Clean bathroom sink/mirror", category: "WEEKLY", lastCompleted: shiftDays(t, -6) },
    { id: "w4", title: "Change sheets", category: "WEEKLY", lastCompleted: shiftDays(t, -12) },
    { id: "w5", title: "Take out trash & recycling", category: "WEEKLY", lastCompleted: shiftDays(t, -8) },

    // MONTHLY
    { id: "m1", title: "Deep clean fridge", category: "MONTHLY", lastCompleted: shiftDays(t, -35) },
    { id: "m2", title: "Dust baseboards & vents", category: "MONTHLY", lastCompleted: shiftDays(t, -14) },
    { id: "m3", title: "Clean oven/microwave", category: "MONTHLY", lastCompleted: shiftDays(t, -45) },
    { id: "m4", title: "Wash windows (main rooms)", category: "MONTHLY", lastCompleted: shiftDays(t, -20) },
    { id: "m5", title: "Declutter one drawer/area", category: "MONTHLY", lastCompleted: shiftDays(t, -25) },
  ];
};

function shiftDays(iso, delta) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getCadenceDays(category) {
  return CATEGORIES.find((c) => c.key === category)?.cadenceDays ?? 7;
}

function dueState(chore) {
  // returns { status: "overdue" | "due-soon" | "ok", daysSince: number, nextDueISO: string }
  const cadence = getCadenceDays(chore.category);
  const today = todayISO();
  const since = daysBetween(chore.lastCompleted, today);
  const nextDue = shiftDays(chore.lastCompleted, cadence);

  if (since > cadence) return { status: "overdue", daysSince: since, nextDueISO: nextDue };
  if (since === cadence) return { status: "due-soon", daysSince: since, nextDueISO: nextDue };
  return { status: "ok", daysSince: since, nextDueISO: nextDue };
}

const STORAGE_KEY = "chores_state_v1";

export default function Chores() {
  const [chores, setChores] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.chores)) return parsed.chores;
      } catch {}
    }
    return defaultChores();
  });

  // Today's plan holds chore IDs
  const [plan, setPlan] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.plan)) return parsed.plan;
      } catch {}
    }
    return [];
  });

  // Completed today (records with id + timestamp + category snapshot)
  const [completedToday, setCompletedToday] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only keep records for today
        const today = todayISO();
        if (Array.isArray(parsed.completed)) {
          return parsed.completed.filter((r) => r.dateISO === today);
        }
      } catch {}
    }
    return [];
  });

  // persist
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        chores,
        plan,
        completed: completedToday,
      })
    );
  }, [chores, plan, completedToday]);

  const byId = useMemo(() => {
    const map = new Map();
    chores.forEach((c) => map.set(c.id, c));
    return map;
  }, [chores]);

  const inPlan = (id) => plan.includes(id);

  // --- DnD helpers ---
  const onDragStart = (e, payload) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const parseDrop = (e) => {
    try {
      const txt = e.dataTransfer.getData("text/plain");
      return JSON.parse(txt);
    } catch {
      return null;
    }
  };

  // Drop into center: add to Today's Plan
  const handleDropToPlan = (e) => {
    e.preventDefault();
    const data = parseDrop(e);
    if (!data?.id) return;
    if (!byId.get(data.id)) return;
    setPlan((p) => (p.includes(data.id) ? p : [...p, data.id]));
  };

  // Drop into left: remove from Today's Plan
  const handleDropToMaster = (e) => {
    e.preventDefault();
    const data = parseDrop(e);
    if (!data?.id) return;
    setPlan((p) => p.filter((x) => x !== data.id));
  };

  // Drop into Completed: update lastCompleted & record completion, remove from plan
  const handleDropToCompleted = (e) => {
    e.preventDefault();
    const data = parseDrop(e);
    if (!data?.id) return;
    const ch = byId.get(data.id);
    if (!ch) return;

    const today = todayISO();

    // Update chore's lastCompleted
    setChores((list) =>
      list.map((c) => (c.id === ch.id ? { ...c, lastCompleted: today } : c))
    );
    // Remove from plan if present
    setPlan((p) => p.filter((x) => x !== ch.id));
    // Record completion (de-dup for today)
    setCompletedToday((prev) => {
      const without = prev.filter((r) => !(r.id === ch.id && r.dateISO === today));
      return [
        ...without,
        { id: ch.id, title: ch.title, category: ch.category, dateISO: today, time: new Date().toLocaleTimeString() },
      ];
    });
  };

  const allowDrop = (e) => e.preventDefault();

  // Grouping helpers
  const choresByCategory = useMemo(() => {
    const g = { DAILY: [], WEEKLY: [], MONTHLY: [] };
    chores.forEach((c) => g[c.category]?.push(c));
    // Sort: overdue first, then due-soon, then ok; then title
    const rank = { overdue: 0, "due-soon": 1, ok: 2 };
    Object.keys(g).forEach((k) =>
      g[k].sort((a, b) => {
        const sa = dueState(a).status;
        const sb = dueState(b).status;
        if (rank[sa] !== rank[sb]) return rank[sa] - rank[sb];
        return a.title.localeCompare(b.title);
      })
    );
    return g;
  }, [chores]);

  const completedByCategory = useMemo(() => {
    const g = { DAILY: [], WEEKLY: [], MONTHLY: [] };
    completedToday.forEach((r) => g[r.category]?.push(r));
    Object.keys(g).forEach((k) =>
      g[k].sort((a, b) => a.title.localeCompare(b.title))
    );
    return g;
  }, [completedToday]);

  // Little legend chip
  const Legend = () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, opacity: 0.9 }}>
      <Chip color="#fee2e2" border="#ef4444" label="Overdue" />
      <Chip color="#fff7ed" border="#f59e0b" label="Due today" />
      <Chip color="#dcfce7" border="#22c55e" label="OK" />
      <Chip color="#e5e7eb" border="#6b7280" label="In plan" />
    </div>
  );

  return (
    <div className="container" style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Chores</h1>
      <p style={{ marginTop: 0, marginBottom: 16 }}>
        Drag from the master list into <strong>Today’s Plan</strong>. Drop into <strong>Completed</strong> to log it (updates last completed).
      </p>
      <Legend />

      <div
        className="grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* LEFT: Master chore list (drop here to remove from plan) */}
        <Column
          title="Master List"
          subtitle="Daily • Weekly • Monthly"
          onDrop={handleDropToMaster}
          onDragOver={allowDrop}
        >
          {CATEGORIES.map((cat) => (
            <CategorySection key={cat.key} icon={cat.icon} label={cat.label}>
              {choresByCategory[cat.key].map((ch) => (
                <ChoreCard
                  key={ch.id}
                  chore={ch}
                  inPlan={inPlan(ch.id)}
                  onDragStart={(e) => onDragStart(e, { id: ch.id, from: "MASTER" })}
                />
              ))}
            </CategorySection>
          ))}
        </Column>

        {/* MIDDLE: Today's Plan (drop target) */}
        <Column
          title="Today's Plan"
          subtitle="Drop chores here to plan"
          onDrop={handleDropToPlan}
          onDragOver={allowDrop}
          highlight
        >
          {plan.length === 0 && (
            <EmptyHint text="Nothing planned yet — drag chores here." />
          )}
          {plan.map((id) => {
            const ch = byId.get(id);
            if (!ch) return null;
            return (
              <PlannedCard
                key={id}
                chore={ch}
                onDragStart={(e) => onDragStart(e, { id, from: "PLAN" })}
              />
            );
          })}
        </Column>

        {/* RIGHT: Completed Today (drop target) */}
        <Column
          title="Completed Today"
          subtitle={`${todayISO()}`}
          onDrop={handleDropToCompleted}
          onDragOver={allowDrop}
        >
          {CATEGORIES.map((cat) => (
            <CategorySection key={cat.key} icon={cat.icon} label={cat.label}>
              {completedByCategory[cat.key].length === 0 ? (
                <EmptyRow key={cat.key} />
              ) : (
                completedByCategory[cat.key].map((r) => (
                  <CompletedRow key={`${r.id}-${r.dateISO}`} item={r} />
                ))
              )}
            </CategorySection>
          ))}
        </Column>
      </div>
    </div>
  );
}

/* ----------- UI Subcomponents ----------- */

function Column({ title, subtitle, children, onDrop, onDragOver, highlight }) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: 12,
        padding: 16,
        minHeight: 420,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        outline: highlight ? "2px dashed #93c5fd" : "none",
        outlineOffset: highlight ? 4 : 0,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "var(--muted, #6b7280)" }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function CategorySection({ icon, label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
          color: "var(--muted, #4b5563)",
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function Chip({ label, color, border }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        fontSize: 12,
        borderRadius: 999,
        background: color,
        border: `1px solid ${border}`,
      }}
    >
      {label}
    </span>
  );
}

function statusColors(status, inPlan = false) {
  // Overdue: red, Due-soon: amber, OK: green, Planned: gray overlay
  const map = {
    overdue: { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },     // brighter red text
    "due-soon": { bg: "#fff7ed", border: "#f59e0b", text: "#b45309" }, // brighter amber text
    ok: { bg: "#dcfce7", border: "#22c55e", text: "#111827" },          // dark text on light green
  };
  const base = map[status] ?? map.ok;
  if (inPlan) {
    return {
      bg: "#f3f4f6",
      border: "#9ca3af",
      text: "#111827",
      badgeBg: base.bg,
      badgeBorder: base.border,
    };
  }
  return { ...base, badgeBg: base.bg, badgeBorder: base.border };
}

function ChoreCard({ chore, inPlan, onDragStart }) {
  const { status, nextDueISO } = dueState(chore);
  const palette = statusColors(status, inPlan);

  return (
    <div
      draggable={!inPlan}
      onDragStart={onDragStart}
      title={inPlan ? "Already in today's plan" : "Drag to Today's Plan"}
      style={{
        userSelect: "none",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        padding: 10,
        opacity: inPlan ? 0.7 : 1,
        cursor: inPlan ? "not-allowed" : "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontWeight: 600,
            color: palette.text,
            lineHeight: 1.15,
          }}
        >
          {chore.title}
        </div>
        <div style={{ fontSize: 12, color: "#374151" }}>
          Last: {chore.lastCompleted} • Next due: {nextDueISO}
        </div>
      </div>

      <span
        style={{
          fontSize: 12,
          padding: "2px 8px",
          borderRadius: 999,
          border: `1px solid ${palette.badgeBorder}`,
          background: palette.badgeBg,
          color: "#111827",
          fontWeight: 600,
        }}
      >
        {status === "ok" ? "OK" : status === "due-soon" ? "Due" : "Overdue"}
      </span>
    </div>
  );
}

function PlannedCard({ chore, onDragStart }) {
  const { status } = dueState(chore);
  const palette = statusColors(status, true);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      title="Drag left to unplan or right to complete"
      style={{
        userSelect: "none",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        padding: 10,
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div style={{ fontWeight: 600, color: palette.text }}>{chore.title}</div>
      <div style={{ fontSize: 12, color: "#374151" }}>{chore.category}</div>
    </div>
  );
}

function CompletedRow({ item }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "#111827",           // darker, readable text
      }}
      title={`Completed at ${item.time}`}
    >
      <span style={{ fontSize: 14 }}>{item.title}</span>
      <span style={{ fontSize: 12, color: "#4b5563" }}>{item.time}</span>
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <div
      style={{
        border: "2px dashed #cbd5e1",
        borderRadius: 12,
        padding: 16,
        textAlign: "center",
        color: "#64748b",
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}

function EmptyRow() {
  return (
    <div
      style={{
        border: "1px dashed #e5e7eb",
        borderRadius: 10,
        padding: 8,
        color: "#9ca3af",
        fontSize: 12,
      }}
    >
      — none —
    </div>
  );
}
