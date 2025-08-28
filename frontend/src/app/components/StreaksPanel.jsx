// src/app/components/StreaksPanel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";

export default function StreaksPanel({
  userId,
  apiBase = "",
  days = 21,
  title = "Streaks (last 21 days)",
  statsPath = "/api/stats/daily_completion",
}) {
  const [streakData, setStreakData] = useState([]); // [{date, completed, total, pct}]
  const [error, setError] = useState(null);

  const fetchStreaks = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const url = new URL(apiBase + statsPath, window.location.origin);
      url.searchParams.set("user_id", String(userId));
      url.searchParams.set("days", String(days));

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
      setError("Could not load streak data.");
      setStreakData([]);
    }
  }, [userId, apiBase, statsPath, days]);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  const maxPct = useMemo(() => {
    if (!streakData.length) return 1;
    return Math.max(...streakData.map((d) => d.pct ?? 0), 1);
  }, [streakData]);

  const cellColor = (pct) => {
    const intensity = Math.round(90 - Math.min(1, pct / (maxPct || 1)) * 60); // 90% -> 30%
    return `hsl(140 60% ${intensity}%)`;
  };

  return (
    <section className="card elev-1">
      <div className="card-header" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span role="img" aria-label="flame">🔥</span>
        <span>{title}</span>
      </div>

      {error && <div className="muted" style={{ padding: 12 }}>{error}</div>}

      <div style={{ padding: 12 }}>
        {streakData.length === 0 ? (
          <div className="muted">Do some habits and your heatmap will light up here.</div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${days}, 16px)`,
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
  );
}
