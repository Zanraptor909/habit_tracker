from datetime import datetime, timedelta, timezone
import os, jwt
import uuid as _uuid
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from google.oauth2 import id_token
from google.auth.transport import requests as g_requests

load_dotenv()

GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
JWT_SECRET       = os.environ["JWT_SECRET"]
JWT_ISS          = os.getenv("JWT_ISS", "habit-tracker")
JWT_AUD          = os.getenv("JWT_AUD", "habit-tracker")
JWT_EXPIRES_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", "30"))
DATABASE_URL     = os.environ["DATABASE_URL"]

FRONTEND_ORIGIN  = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
COOKIE_NAME      = os.getenv("COOKIE_NAME", "session")
COOKIE_DOMAIN    = os.getenv("COOKIE_DOMAIN", "localhost")
COOKIE_SECURE    = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE  = os.getenv("COOKIE_SAMESITE", "lax")  # lax/strict/none

pool = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DATABASE_URL)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GoogleCredential(BaseModel):
    credential: str

def create_jwt(sub_uuid: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub_uuid,  # UUID as string
        "email": email,
        "iss": JWT_ISS,
        "aud": JWT_AUD,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_EXPIRES_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=JWT_EXPIRES_DAYS * 24 * 3600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        domain=None if COOKIE_DOMAIN == "localhost" else COOKIE_DOMAIN,
        path="/",
    )

def clear_session_cookie(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME,
        domain=None if COOKIE_DOMAIN == "localhost" else COOKIE_DOMAIN,
        path="/",
    )

def dbconn():
    return pool.getconn()

def dbput(conn):
    if conn:
        pool.putconn(conn)

def current_user_from_cookie(request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience=JWT_AUD, issuer=JWT_ISS)
        return {"id": payload["sub"], "email": payload["email"]}
    except Exception:
        return None

@app.post("/auth/google")
def auth_google(body: GoogleCredential):
    if not body.credential:
        raise HTTPException(status_code=400, detail="Missing credential")

    # Verify Google ID token
    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential, g_requests.Request(), GOOGLE_CLIENT_ID
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
        "id": row[0],         # UUID string
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

@app.get("/me")
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

@app.post("/logout")
def logout():
    resp = JSONResponse({"ok": True})
    clear_session_cookie(resp)
    return resp
