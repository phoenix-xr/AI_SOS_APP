# HealthMitra FastAPI Backend (PostgreSQL & JWT Authentication)

A modern, production-ready FastAPI backend with self-hosted PostgreSQL via Docker and PyJWT authentication, integrated with the [HealthM](file:///c:/Users/anshy/Documents/android-dev/health-m/HealthM) React Native mobile application.

---

## 🚀 Features

- **Self-Hosted PostgreSQL**: Orchestrated with Docker Compose (`healthm_postgres`), health-checked, with persistent volume storage.
- **JWT Authentication**: Secure user registration, login (supports username or email), and `/me` profile routes.
- **Password Security**: Bcrypt salted password hashing.
- **Async Database Stack**: SQLAlchemy 2.0 (asyncio) + `asyncpg` with automatic startup table creation.
- **Cross-Platform CORS**: Configured for Android Emulator (`10.0.2.2`), iOS Simulator, and LAN devices.
- **Package Management via uv**: Lightning-fast virtual environments and builds using Astral `uv`.

---

## 🐳 Quick Start: Self-Hosted PostgreSQL with Docker

### Option A: PowerShell Helper (Recommended on Windows)
1. Ensure **Docker Desktop** is running.
2. Run:
   ```powershell
   .\start-postgres.ps1
   ```

### Option B: Docker Compose Command
```bash
docker compose up -d postgres adminer
```
This spins up:
- **PostgreSQL 16** on `localhost:5432` (`healthmitra_db`)
- **Adminer Web GUI** on `http://localhost:8080` (or `http://your-vps-ip:8080`)

To run the complete stack (backend + postgres + adminer) inside Docker:
```bash
docker compose up -d --build
```

---

## 🖥️ Inspecting the Database via Web (Adminer)

Open your browser to [http://localhost:8080](http://localhost:8080) (or `http://your-vps-ip:8080` on a VPS):
- **System:** `PostgreSQL`
- **Server:** `postgres`
- **Username:** `postgres`
- **Password:** `postgres`
- **Database:** `healthmitra_db`

From here, you can visually view the `users` table, examine records, test SQL queries, and manage columns.

---

## ⚡ Starting the FastAPI Backend

Run with `uv`:
```bash
uv run uvicorn backend_h.main:app --reload --host 0.0.0.0 --port 8000
```

The API endpoints will be live at:
- **Swagger Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Base URL**: `http://localhost:8000/api/v1`
- **Health Check**: `http://localhost:8000/api/v1/health`

---

## 🔐 Authentication Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new user (`username`, `email`, `password`, `full_name`). Returns JWT access token. |
| `POST` | `/api/v1/auth/login` | Login with username or email + password. Returns JWT access token. |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile using `Authorization: Bearer <token>`. |

---

## 📱 React Native Integration (HealthM)

The React Native app in [HealthM](file:///c:/Users/anshy/Documents/android-dev/health-m/HealthM) is pre-configured to communicate with this backend:

- **Android Emulator**: Automatically routes to `http://10.0.2.2:8000/api/v1`.
- **iOS Simulator**: Routes to `http://localhost:8000/api/v1`.
- **Physical Device**: Tap the server indicator at the bottom of the login screen to enter your computer's local Wi-Fi IP (e.g. `http://192.168.1.50:8000/api/v1`).
- **Token Persistence**: JWT tokens and session data are stored locally using `@react-native-async-storage/async-storage`.

---

## 🧪 Running Tests

```bash
uv run pytest
```
