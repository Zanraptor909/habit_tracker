# app/routers/streaks.py
from datetime import date
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Query, Request, HTTPException

router = APIRouter()

@router.get("/stats/ping")
async def stats_ping():
    return {"ok": True, "router": "streaks", "path": "/api/stats/ping"}

async def _compute_daily_completion(
    request: Request,
    user_id: str,
    days: int,
    end_day: Optional[date],
) -> List[Dict[str, Any]]:
    # Validate UUID explicitly
    try:
        uid = UUID(user_id)
    except Exception:
        raise HTTPException(status_code=422, detail="user_id must be a valid UUID")

    pool = getattr(request.app.state, "pool", None)
    if pool is None:
        raise HTTPException(status_code=500, detail="DB pool not initialized")

    # If no end_day provided, use CURRENT_DATE in SQL; else bind end_day
    # We’ll keep two similar SQLs for clarity.
    if end_day is None:
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
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to compute streaks: {e}")
    else:
        sql = """
          WITH days AS (
            SELECT generate_series($3::date - ($2::int - 1), $3::date, INTERVAL '1 day')::date AS day
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
            WHERE l.day BETWEEN ($3::date - ($2::int - 1)) AND $3::date
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
                rows = await conn.fetch(sql, str(uid), days, end_day.isoformat())
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to compute streaks: {e}")

    return [dict(r) for r in rows]

# Keep your existing v2 path
@router.get("/stats/daily_completion_v2")
async def daily_completion_v2(
    request: Request,
    user_id: str = Query(..., description="User ID (UUID as string)"),
    days: int = Query(21, ge=1, le=365, description="How many days back"),
    end_day: Optional[date] = Query(None, description="YYYY-MM-DD (optional end date)"),
) -> List[Dict[str, Any]]:
    return await _compute_daily_completion(request, user_id, days, end_day)

# Add a compatibility alias the frontend expects
@router.get("/stats/daily_completion")
async def daily_completion(
    request: Request,
    user_id: str = Query(..., description="User ID (UUID as string)"),
    days: int = Query(21, ge=1, le=365, description="How many days back"),
    end_day: Optional[date] = Query(None, description="YYYY-MM-DD (optional end date)"),
) -> List[Dict[str, Any]]:
    return await _compute_daily_completion(request, user_id, days, end_day)
