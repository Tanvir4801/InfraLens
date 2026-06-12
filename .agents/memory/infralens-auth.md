---
name: InfraLens PostgreSQL auth
description: How auth, users, sessions, and audit logs are stored in PostgreSQL for the InfraLens project.
---

# InfraLens Auth Architecture

## Tables
- `infralens_users` — id (uuid text PK), username, email, password_hash (bcrypt), role, department, status, last_login, online, created_at
- `infralens_sessions` — id, user_id FK, token (unique), ip, created_at, last_active
- `infralens_audit_log` — id serial, username, action, resource, ip, created_at

## Seed accounts
- admin / admin123 / role=admin
- operator / operator123 / role=operator
- viewer / viewer123 / role=viewer
- supervisor / supervisor123 / role=supervisor

## Key patterns
- `db.py` wraps psycopg2 synchronously with a module-level connection + threading.Lock; autocommit=True
- FastAPI reads auth token via `Header(default="")` on the `Authorization` header (strips "Bearer " prefix)
- Tokens are opaque UUIDs prefixed with "ilens-"; stored in infralens_sessions; validated on every protected call via `get_session_user(token)`
- bcrypt via `pip install bcrypt psycopg2-binary`; `verify_password(plain, hash)` wraps checkpw safely
- Datetime columns come back as Python datetime objects from psycopg2 RealDictCursor — must `.isoformat()` before JSON serialization

**Why:** Moved from in-memory dict (lost on restart) to PostgreSQL so credentials and sessions survive backend restarts.
