from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from app.core.db import dbconn, dbput
from app.core.auth import current_user_from_cookie
from app.schemas import HabitCreate, HabitLogCreate

router = APIRouter()

@router.get("/checklist/today")
def checklist_today(request: Request):
    cj = current_user_from_cookie(request)
    if not cj:
        raise HTTPException(status_code=401, detail="Not signed in")

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
                FROM habit h
                JOIN habit_slot s ON s.habit_id = h.id
                LEFT JOIN habit_log l
                  ON l.habit_id = h.id
                 AND l.period   = s.period
                 AND l.day      = CURRENT_DATE
                WHERE h.user_id = %s::uuid
                  AND h.archived = FALSE
                ORDER BY s.period, COALESCE(s.local_time, '23:59'::time)
                """,
                (cj["id"],),
            )
            rows = cur.fetchall()
    finally:
        dbput(conn)

    return [
        {
            "habit_id": r[0],
            "name": r[1],
            "period": r[2],
            "local_time": r[3].strftime("%H:%M") if r[3] else None,
            "completed": r[4],
        }
        for r in rows
    ]

@router.post("/habit_log")
def habit_log(request: Request, body: HabitLogCreate):
    cj = current_user_from_cookie(request)
    if not cj:
        raise HTTPException(status_code=401, detail="Not signed in")

    conn = dbconn()
    try:
        with conn, conn.cursor() as cur:
            # verify habit belongs to user
            cur.execute("SELECT 1 FROM habit WHERE id = %s AND user_id = %s::uuid", (body.habit_id, cj["id"]))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Habit not found")

            cur.execute(
                """
                INSERT INTO habit_log (habit_id, period, day, completed)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (habit_id, day, period)
                DO UPDATE SET completed = EXCLUDED.completed
                RETURNING habit_id, period, day, completed
                """,
                (body.habit_id, body.period, body.day, body.completed),
            )
            r = cur.fetchone()
    finally:
        dbput(conn)

    return {
        "habit_id": r[0],
        "period": r[1],
        "day": r[2].isoformat(),
        "completed": r[3],
    }

@router.post("/habits", status_code=201)
def create_habit(request: Request, body: HabitCreate):
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
            # insert habit
            cur.execute(
                """
                INSERT INTO habit (user_id, name, archived)
                VALUES (%s::uuid, %s, FALSE)
                RETURNING id
                """,
                (cj["id"], body.name),
            )
            habit_id = cur.fetchone()[0]

            # insert habit slot
            cur.execute(
                """
                INSERT INTO habit_slot (habit_id, period, local_time)
                VALUES (%s, %s, %s)
                """,
                (habit_id, body.period, lt),
            )
    finally:
        dbput(conn)

    return {"id": habit_id, "name": body.name, "period": body.period, "local_time": body.local_time}
