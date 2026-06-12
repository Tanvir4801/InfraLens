"""
PostgreSQL connection helpers for InfraLens backend.
Uses psycopg2 (synchronous) wrapped in thread-pool calls so FastAPI async routes stay non-blocking.
"""
import os
import threading
import bcrypt
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
from typing import Any

_lock = threading.Lock()
_conn: psycopg2.extensions.connection | None = None


def _get_conn() -> psycopg2.extensions.connection:
    global _conn
    with _lock:
        if _conn is None or _conn.closed:
            dsn = os.environ.get("DATABASE_URL", "")
            _conn = psycopg2.connect(dsn, cursor_factory=psycopg2.extras.RealDictCursor)
            _conn.autocommit = True
        return _conn


def query(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(sql, params)
        try:
            return [dict(r) for r in cur.fetchall()]
        except psycopg2.ProgrammingError:
            return []


def execute(sql: str, params: tuple = ()) -> None:
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute(sql, params)


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── User helpers ──────────────────────────────────────────────────────────────

def get_user_by_username(username: str) -> dict[str, Any] | None:
    rows = query(
        "SELECT id, username, email, role, department, status, last_login, online "
        "FROM infralens_users WHERE username = %s",
        (username,)
    )
    return rows[0] if rows else None


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    rows = query(
        "SELECT id, username, email, role, department, status, last_login, online "
        "FROM infralens_users WHERE id = %s",
        (user_id,)
    )
    return rows[0] if rows else None


def get_all_users() -> list[dict[str, Any]]:
    return query(
        "SELECT id, username, email, role, department, status, last_login, online "
        "FROM infralens_users ORDER BY created_at"
    )


def create_user(username: str, email: str, role: str, department: str, password: str) -> dict[str, Any]:
    pw_hash = hash_password(password)
    rows = query(
        """INSERT INTO infralens_users (username, email, password_hash, role, department)
           VALUES (%s, %s, %s, %s, %s)
           RETURNING id, username, email, role, department, status, last_login, online""",
        (username, email, pw_hash, role, department)
    )
    return rows[0]


def update_user(user_id: str, fields: dict[str, Any]) -> dict[str, Any] | None:
    allowed = {"email", "role", "department", "status", "online"}
    safe = {k: v for k, v in fields.items() if k in allowed}
    if not safe:
        return get_user_by_id(user_id)
    sets = ", ".join(f"{k} = %s" for k in safe)
    vals = list(safe.values()) + [user_id]
    rows = query(
        f"""UPDATE infralens_users SET {sets}
            WHERE id = %s
            RETURNING id, username, email, role, department, status, last_login, online""",
        tuple(vals)
    )
    return rows[0] if rows else None


def delete_user(user_id: str) -> bool:
    before = query("SELECT id FROM infralens_users WHERE id = %s", (user_id,))
    if not before:
        return False
    execute("DELETE FROM infralens_users WHERE id = %s", (user_id,))
    return True


def toggle_user_status(user_id: str) -> dict[str, Any] | None:
    rows = query(
        """UPDATE infralens_users
           SET status = CASE WHEN status='active' THEN 'inactive' ELSE 'active' END
           WHERE id = %s
           RETURNING id, username, email, role, department, status, last_login, online""",
        (user_id,)
    )
    return rows[0] if rows else None


def change_password(user_id: str, old_plain: str, new_plain: str) -> bool:
    rows = query("SELECT password_hash FROM infralens_users WHERE id = %s", (user_id,))
    if not rows:
        return False
    if not verify_password(old_plain, rows[0]["password_hash"]):
        return False
    new_hash = hash_password(new_plain)
    execute("UPDATE infralens_users SET password_hash = %s WHERE id = %s", (new_hash, user_id))
    return True


def update_last_login(user_id: str) -> None:
    execute(
        "UPDATE infralens_users SET last_login = %s, online = true WHERE id = %s",
        (datetime.now(timezone.utc), user_id)
    )


# ── Auth token helpers ────────────────────────────────────────────────────────

def save_session(user_id: str, token: str, ip: str = "") -> None:
    execute(
        "INSERT INTO infralens_sessions (user_id, token, ip) VALUES (%s, %s, %s) ON CONFLICT (token) DO NOTHING",
        (user_id, token, ip)
    )


def get_session_user(token: str) -> dict[str, Any] | None:
    rows = query(
        """SELECT u.id, u.username, u.email, u.role, u.department, u.status
           FROM infralens_sessions s
           JOIN infralens_users u ON u.id = s.user_id
           WHERE s.token = %s""",
        (token,)
    )
    if rows:
        execute("UPDATE infralens_sessions SET last_active = NOW() WHERE token = %s", (token,))
    return rows[0] if rows else None


def delete_session(token: str) -> None:
    execute("DELETE FROM infralens_sessions WHERE token = %s", (token,))


def get_active_sessions() -> list[dict[str, Any]]:
    return query(
        """SELECT u.username, u.role, s.ip, s.created_at as login, s.last_active
           FROM infralens_sessions s
           JOIN infralens_users u ON u.id = s.user_id
           ORDER BY s.last_active DESC
           LIMIT 50"""
    )


# ── Audit log helpers ─────────────────────────────────────────────────────────

def add_audit(username: str, action: str, resource: str, ip: str = "—") -> None:
    execute(
        "INSERT INTO infralens_audit_log (username, action, resource, ip) VALUES (%s, %s, %s, %s)",
        (username, action, resource, ip)
    )


def get_audit_logs(limit: int = 200) -> list[dict[str, Any]]:
    return query(
        "SELECT username, action, resource, ip, created_at as timestamp "
        "FROM infralens_audit_log ORDER BY created_at DESC LIMIT %s",
        (limit,)
    )
