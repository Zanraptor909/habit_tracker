from psycopg2.pool import SimpleConnectionPool
from app.core.config import settings

pool = SimpleConnectionPool(minconn=1, maxconn=5, dsn=settings.DATABASE_URL)

def dbconn():
    return pool.getconn()

def dbput(conn):
    if conn:
        pool.putconn(conn)
