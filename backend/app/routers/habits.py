# app/routers/habits.py
from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Query

from app.core.db import dbconn, dbput
from app.core.auth import current_user_from_cookie
from app.schemas import HabitCreate, HabitLogCreate

router = APIRouter()

@router.get("/checklist/today")
def checklist_today(
    request: Request,
    day: date | None = Query(
        None,
        description="Calendar day in user's local time (YYYY-MM-DD). Defaults to server 'today' if omitted."
    ),
):
    """
    Return the user's checklist for a specific calendar day.
    CRITICAL: LEFT JOIN to habit_log ON that day so completion is per-day.
    """
    cj = current_user_from_cookie(request)
    if not cj:
        raise HTTPException(status_code=401, detail="Not signed in")

    target_day = day or date.today()

    conn = dbconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT h.id AS habit_id,
                       h.name,
                       s.period,
                       s.local_time,
                       COALESCE(l.completed, false) AS completed
                FROM public.habit h
                JOIN public.habit_slot s
                  ON s.habit_id = h.id
                LEFT JOIN public.habit_log l
                  ON l.habit_id = h.id
                 AND l.period   = s.period
                 AND l.day      = %s::date        -- <<< per-day join (uses ?day)
                WHERE h.user_id = %s::uuid
                  AND h.archived = FALSE
                ORDER BY s.period, COALESCE(s.local_time, '23:59'::time), h.name
                """,
                (target_day.isoformat(), cj["id"]),
            )
            rows = cur.fetchall()
    finally:
        dbput(conn)

    return [
        {
            "habit_id": str(r[0]),
            "name": r[1],
            "period": r[2],
            "local_time": r[3].strftime("%H:%M") if r[3] else None,
            "completed": r[4],
        }
        for r in rows
    ]


@router.post("/habit_log")
def habit_log(request: Request, body: HabitLogCreate):
    """
    Upsert a completion for a habit on a given day/period.
    Enforces uniqueness on (habit_id, day, period) via DB constraint.
    """
    cj = current_user_from_cookie(request)
    if not cj:
        raise HTTPException(status_code=401, detail="Not signed in")

    try:
        habit_uuid = UUID(str(body.habit_id))
    except Exception:
        raise HTTPException(status_code=422, detail="habit_id must be a valid UUID")

    conn = dbconn()
    try:
        with conn, conn.cursor() as cur:
            # Ensure the habit belongs to the signed-in user
            cur.execute(
                "SELECT 1 FROM public.habit WHERE id = %s::uuid AND user_id = %s::uuid",
                (str(habit_uuid), cj["id"]),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Habit not found")

            # UPSERT completion for that calendar day
            cur.execute(
                """
                INSERT INTO public.habit_log (habit_id, period, day, completed, note)
                VALUES (%s::uuid, %s::time_period, %s::date, %s::boolean, %s::text)
                ON CONFLICT (habit_id, day, period)
                DO UPDATE SET
                  completed = EXCLUDED.completed,
                  note      = COALESCE(EXCLUDED.note, public.habit_log.note)
                RETURNING habit_id, period, day, completed, note, created_at
                """,
                (str(habit_uuid), body.period, body.day, body.completed, body.note),
            )
            r = cur.fetchone()
    finally:
        dbput(conn)

    return {
        "habit_id": str(r[0]),
        "period": r[1],
        "day": r[2].isoformat(),
        "completed": r[3],
        "note": r[4],
        "created_at": r[5].isoformat(),
    }


@router.post("/habits", status_code=201)
def create_habit(request: Request, body: HabitCreate):
    """
    Create a habit for the current user and its slot for the chosen period/time.
    """
    cj = current_user_from_cookie(request)
    if not cj:
        raise HTTPException(status_code=401, detail="Not signed in")

    lt = None
    if body.local_time:
        try:
            lt = datetime.strptime(body.local_time, "%H:%M").time()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format, expected HH:MM")

    conn = dbconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO public.habit (user_id, name, archived)
                VALUES (%s::uuid, %s, FALSE)
                RETURNING id
                """,
                (cj["id"], body.name),
            )
            habit_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO public.habit_slot (habit_id, period, local_time)
                VALUES (%s::uuid, %s::time_period, %s)
                """,
                (str(habit_id), body.period, lt),
            )
    finally:
        dbput(conn)

    return {
        "id": str(habit_id),
        "name": body.name,
        "period": body.period,
        "local_time": body.local_time,
    }
