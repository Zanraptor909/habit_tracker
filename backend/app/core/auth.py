# app/core/auth.py
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import Request, Response
from app.core.config import settings


# ──────────────────────────
# JWT helpers
# ──────────────────────────
def create_jwt(sub_uuid: str, email: str, extra: Optional[Dict[str, Any]] = None) -> str:
    """
    Create a signed JWT for a user session.
    Payload contains: sub (UUID), email, iss, aud, iat, exp (+ any extra claims).
    """
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": sub_uuid,
        "email": email,
        "iss": settings.JWT_ISS,
        "aud": settings.JWT_AUD,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=settings.JWT_EXPIRES_DAYS)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_jwt(token: str) -> Dict[str, Any]:
    """
    Verify and decode a session JWT. Raises on failure.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=["HS256"],
        audience=settings.JWT_AUD,
        issuer=settings.JWT_ISS,
    )


# ──────────────────────────
# Cookie helpers
# ──────────────────────────
def _cookie_domain_for_env(host_override: Optional[str] = None) -> Optional[str]:
    """
    Compute the cookie domain:
      - If settings.COOKIE_DOMAIN is "", None, or "localhost": return None (host-only cookie).
      - Otherwise return the configured domain (e.g. ".example.com" or "api.example.com").
    You can pass host_override to force a domain for special cases.
    """
    if host_override:
        return host_override
    cd = (settings.COOKIE_DOMAIN or "").strip().lower()
    if not cd or cd == "localhost":
        return None
    return cd


def _cookie_common_kwargs() -> Dict[str, Any]:
    """
    Common kwargs for cross-site cookies when frontend and backend are on different origins.
    In production you typically want:
      - httponly=True
      - secure=True    (required by browsers when SameSite=None)
      - samesite="none"
    """
    return {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,        # True in production
        "samesite": settings.COOKIE_SAMESITE,    # "none" for cross-site
        "path": "/",
    }


def set_session_cookie(response: Response, token: str, *, domain: Optional[str] = None) -> None:
    """
    Set the signed session cookie with proper attributes for cross-site usage.
    """
    max_age = settings.JWT_EXPIRES_DAYS * 24 * 3600
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=max_age,
        domain=_cookie_domain_for_env(domain),
        **_cookie_common_kwargs(),
    )


def clear_session_cookie(response: Response, *, domain: Optional[str] = None) -> None:
    """
    Clear the session cookie. Pass the same domain attributes used when setting the cookie.
    Some browsers require matching SameSite/Secure attributes to reliably clear cookies.
    """
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        domain=_cookie_domain_for_env(domain),
        path="/",
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )


# ──────────────────────────
# Current user helper
# ──────────────────────────
def current_user_from_cookie(request: Request) -> Optional[Dict[str, Any]]:
    """
    Read the session cookie and return a minimal user dict {id, email} or None.
    """
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        return None
    try:
        payload = decode_jwt(token)
        return {"id": payload["sub"], "email": payload.get("email")}
    except Exception:
        return None


__all__ = [
    "create_jwt",
    "decode_jwt",
    "set_session_cookie",
    "clear_session_cookie",
    "current_user_from_cookie",
]
