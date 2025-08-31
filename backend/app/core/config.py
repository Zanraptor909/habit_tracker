from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    GOOGLE_CLIENT_ID: str
    JWT_SECRET: str
    DATABASE_URL: str

    # defaults
    JWT_ISS: str = "habit-tracker"
    JWT_AUD: str = "habit-tracker"
    JWT_EXPIRES_DAYS: int = 30

    FRONTEND_ORIGIN: str = "https://habit-tracker-dusky-five.vercel.app/"

    COOKIE_NAME: str = "session"
    COOKIE_DOMAIN: str = "localhost"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    class Config:
        env_file = ".env"   # ✅ auto-load from .env

@lru_cache
def get_settings():
    return Settings()

settings = get_settings()
