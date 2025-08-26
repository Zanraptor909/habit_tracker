# app/routers/streaks.py
from fastapi import APIRouter, Query, Request, HTTPException
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter()

@router.get("/stats/ping")
async def stats_ping():
    return {"ok": True, "router": "streaks", "path": "/api/stats/ping"}

@router.get("/stats/daily_completion_v2")
async def daily_completion_v2(
    request: Request,
    user_id: str = Query(..., description="User ID (UUID as string)"),
    days: int = Query(21, ge=1, le=365, description="How many days back"),
) -> List[Dict[str, Any]]:
    # Validate UUID explicitly (avoids any stale int parsers)
    try:
        uid = UUID(user_id)
    except Exception:
        raise HTTPException(status_code=422, detail="user_id must be a valid UUID")

    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(status_code=500, detail="DB pool not initialized")

    sql = """
      WITH days AS (
        SELECT generate_series(CURRENT_DATE - ($2::int - 1), CURRENT_DATE, INTERVAL '1 day')::date AS day
      ),
      slots AS (
        SELECT s.habit_id, s.period
        FROM public.habit h
        JOIN public.habit_slot s ON s.habit_id = h.id
        WHERE h.user_id = $1::uuid
          AND h.archived = FALSE
      ),
      totals AS (
        SELECT d.day, COUNT(*)::int AS total
        FROM days d
        LEFT JOIN LATERAL (SELECT 1 FROM slots) z ON TRUE
        GROUP BY d.day
      ),
      completions AS (
        SELECT l.day, COUNT(*)::int AS completed
        FROM public.habit_log l
        JOIN slots s
          ON s.habit_id = l.habit_id
         AND s.period    = l.period
        WHERE l.day BETWEEN CURRENT_DATE - ($2::int - 1) AND CURRENT_DATE
          AND l.completed = TRUE
        GROUP BY l.day
      )
      SELECT
        d.day::text                      AS date,
        COALESCE(c.completed, 0)         AS completed,
        COALESCE(t.total, 0)             AS total,
        CASE WHEN COALESCE(t.total, 0) > 0
             THEN COALESCE(c.completed, 0)::float / t.total
             ELSE 0
        END                              AS pct
      FROM days d
      LEFT JOIN totals t ON t.day = d.day
      LEFT JOIN completions c ON c.day = d.day
      ORDER BY d.day;
    """
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(sql, str(uid), days)
            return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute streaks: {e}")
