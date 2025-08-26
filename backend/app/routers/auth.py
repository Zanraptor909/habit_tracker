from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from google.oauth2 import id_token
from google.auth.transport import requests as g_requests

from app.core.config import settings
from app.core.db import dbconn, dbput
from app.core.auth import create_jwt, set_session_cookie, clear_session_cookie, current_user_from_cookie
from app.schemas import GoogleCredential

router = APIRouter()

@router.post("/auth/google")
def auth_google(body: GoogleCredential):
    if not body.credential:
        raise HTTPException(status_code=400, detail="Missing credential")

    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential, g_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = idinfo.get("email")
    name = idinfo.get("name")
    image_url = idinfo.get("picture")
    if not email:
        raise HTTPException(status_code=400, detail="Google token missing email")

    conn = dbconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO public.app_user (email, "name", image_url)
                VALUES (%s, %s, %s)
                ON CONFLICT (email) DO UPDATE
                   SET "name" = COALESCE(EXCLUDED."name", public.app_user."name"),
                       image_url = COALESCE(EXCLUDED.image_url, public.app_user.image_url)
                RETURNING id::text, email, "name", image_url, timezone, created_at
                """,
                (email, name, image_url),
            )
            row = cur.fetchone()
    finally:
        dbput(conn)

    user = {
        "id": row[0],
        "email": row[1],
        "name": row[2],
        "image_url": row[3],
        "timezone": row[4],
        "created_at": row[5].isoformat() if row[5] else None,
    }

    token = create_jwt(user["id"], user["email"])
    resp = JSONResponse({"user": user})
    set_session_cookie(resp, token)
    return resp

@router.get("/me")
def me(request: Request):
    cj = current_user_from_cookie(request)
    if not cj:
        return {"user": None}

    conn = dbconn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """SELECT id::text, email, "name", image_url, timezone, created_at
                   FROM public.app_user WHERE id = %s::uuid""",
                (cj["id"],),
            )
            row = cur.fetchone()
    finally:
        dbput(conn)

    if not row:
        return {"user": None}

    user = {
        "id": row[0],
        "email": row[1],
        "name": row[2],
        "image_url": row[3],
        "timezone": row[4],
        "created_at": row[5].isoformat() if row[5] else None,
    }
    return {"user": user}

@router.post("/logout")
def logout():
    resp = JSONResponse({"ok": True})
    clear_session_cookie(resp)
    return resp
