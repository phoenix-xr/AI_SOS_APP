# HealthMitra FastAPI Backend (Supabase Cloud)

A modern FastAPI backend integrated with Supabase Cloud Auth & Database, serving the HealthMitra ([HealthM](file:///c:/Users/anshy/Documents/android-dev/health-m/HealthM)) React Native mobile app.

---

## Features

- **Supabase Cloud Native**: Uses Supabase Auth and PostgREST directly (no local Docker or PostgreSQL required).
- **Authentication**: Supports login with either username or email, registration with auto-confirm, and `/me` profile retrieval.
- **Cross-Platform CORS**: Configured for Android Emulator (`10.0.2.2`), iOS Simulator, and LAN devices.
- **Fast Startup**: Managed with Astral `uv` for instant dependency resolution.

---

## Starting the FastAPI Backend

Run with `uv`:
```powershell
uv run uvicorn backend_h.main:app --reload --host 0.0.0.0 --port 8000
```

The API endpoints will be live at:
- **Swagger Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Base URL**: `http://localhost:8000/api/v1`
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user via Supabase |
| `POST` | `/api/v1/auth/login` | Login via username or email + password |
| `GET`  | `/api/v1/auth/me` | Fetch user profile with Bearer token |
| `GET`  | `/api/v1/health` | Health & Supabase connectivity check |
