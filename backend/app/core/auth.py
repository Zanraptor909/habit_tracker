from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Request, Response
from app.core.config import settings

def create_jwt(sub_uuid: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub_uuid,
        "email": email,
        "iss": settings.JWT_ISS,
        "aud": settings.JWT_AUD,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.JWT_EXPIRES_DAYS)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def set_session_cookie(response: Response, token: str):
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.JWT_EXPIRES_DAYS * 24 * 3600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=None if settings.COOKIE_DOMAIN == "localhost" else settings.COOKIE_DOMAIN,
        path="/",
    )

def clear_session_cookie(response: Response):
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        domain=None if settings.COOKIE_DOMAIN == "localhost" else settings.COOKIE_DOMAIN,
        path="/",
    )

def current_user_from_cookie(request: Request):
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            audience=settings.JWT_AUD,
            issuer=settings.JWT_ISS,
        )
        return {"id": payload["sub"], "email": payload["email"]}
    except Exception:
        return None
