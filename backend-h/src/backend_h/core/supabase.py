import logging
from typing import Any, Dict, Optional
import httpx
from fastapi import HTTPException, status

from backend_h.core.config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    def __init__(self):
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.publishable_key = settings.SUPABASE_PUBLISHABLE_KEY
        self.secret_key = settings.SUPABASE_SECRET_KEY or settings.SUPABASE_PUBLISHABLE_KEY

    def _anon_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "apikey": self.publishable_key,
            "Content-Type": "application/json",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _admin_headers(self) -> Dict[str, str]:
        return {
            "apikey": self.secret_key,
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def check_health(self) -> bool:
        """Check if Supabase Auth/REST endpoint is reachable."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{self.base_url}/rest/v1/",
                    headers={"apikey": self.secret_key},
                )
                return resp.status_code < 500
        except Exception as exc:
            logger.warning("Supabase health check failed: %s", exc)
            return False

    async def resolve_email(self, username_or_email: str) -> str:
        """If input is an email, return it. If it's a username, resolve from public.users."""
        if "@" in username_or_email:
            return username_or_email.strip()

        username = username_or_email.strip()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{self.base_url}/rest/v1/users?username=eq.{username}&select=email",
                    headers=self._admin_headers(),
                )
                if resp.status_code == 200:
                    records = resp.json()
                    if records and len(records) > 0 and records[0].get("email"):
                        return records[0]["email"]
        except Exception as exc:
            logger.warning("Error resolving username '%s': %s", username, exc)

        return f"{username.lower()}@healthmitra.com"

    async def get_user_profile(self, user_id: str, auth_user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Fetch user profile from public.users or fall back to auth metadata."""
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"{self.base_url}/rest/v1/users?id=eq.{user_id}&select=*",
                    headers=self._admin_headers(),
                )
                if resp.status_code == 200:
                    records = resp.json()
                    if records and len(records) > 0:
                        row = records[0]
                        return {
                            "id": row.get("id"),
                            "username": row.get("username") or "user",
                            "email": row.get("email") or "",
                            "full_name": row.get("full_name"),
                            "role": row.get("role") or "user",
                            "is_active": row.get("is_active", True),
                            "created_at": row.get("created_at"),
                        }
        except Exception as exc:
            logger.warning("Could not fetch user profile for %s from public.users: %s", user_id, exc)

        # Fallback to auth metadata
        metadata = (auth_user or {}).get("user_metadata", {})
        return {
            "id": user_id,
            "username": metadata.get("username") or "user",
            "email": (auth_user or {}).get("email") or "",
            "full_name": metadata.get("full_name"),
            "role": metadata.get("role") or (auth_user or {}).get("app_metadata", {}).get("role") or "user",
            "is_active": True,
            "created_at": (auth_user or {}).get("created_at"),
        }

    async def login(self, username_or_email: str, password: str) -> Dict[str, Any]:
        """Authenticate user against Supabase Auth and return tokens + profile."""
        email = await self.resolve_email(username_or_email)

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{self.base_url}/auth/v1/token?grant_type=password",
                headers=self._anon_headers(),
                json={"email": email, "password": password},
            )

        if resp.status_code != 200:
            error_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            msg = (
                error_data.get("msg")
                or error_data.get("error_description")
                or error_data.get("message")
                or "Invalid login credentials"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg,
            )

        data = resp.json()
        access_token = data["access_token"]
        auth_user = data.get("user", {})
        user_id = auth_user.get("id")

        user_profile = await self.get_user_profile(user_id, auth_user)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_profile,
        }

    async def register(
        self,
        username: str,
        email: str,
        password: str,
        full_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Register a new user in Supabase, auto-confirm email, and return session."""
        clean_username = username.strip()
        clean_email = email.strip().lower()

        # Check if username already exists in public.users
        async with httpx.AsyncClient(timeout=8.0) as client:
            check_resp = await client.get(
                f"{self.base_url}/rest/v1/users?username=eq.{clean_username}&select=id",
                headers=self._admin_headers(),
            )
            if check_resp.status_code == 200 and len(check_resp.json()) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Username '{clean_username}' is already taken",
                )

        # Create user via Supabase Admin API with pre-confirmed email
        async with httpx.AsyncClient(timeout=10.0) as client:
            admin_resp = await client.post(
                f"{self.base_url}/auth/v1/admin/users",
                headers=self._admin_headers(),
                json={
                    "email": clean_email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {
                        "username": clean_username,
                        "full_name": full_name or "",
                    },
                },
            )

        if admin_resp.status_code not in (200, 201):
            error_data = admin_resp.json() if admin_resp.headers.get("content-type", "").startswith("application/json") else {}
            msg = (
                error_data.get("msg")
                or error_data.get("message")
                or error_data.get("error_description")
                or "Registration failed. An account with this email may already exist."
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg,
            )

        created_user = admin_resp.json()
        user_id = created_user.get("id")

        # Upsert into public.users table to guarantee immediate consistency
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                await client.post(
                    f"{self.base_url}/rest/v1/users",
                    headers={
                        **self._admin_headers(),
                        "Prefer": "resolution=merge-duplicates",
                    },
                    json={
                        "id": user_id,
                        "username": clean_username,
                        "email": clean_email,
                        "full_name": full_name or "",
                        "is_active": True,
                        "role": "user",
                    },
                )
        except Exception as exc:
            logger.warning("Could not upsert public.users directly (trigger might handle it): %s", exc)

        # Automatically log the user in to get an active token session
        return await self.login(clean_email, password)

    async def get_user_from_token(self, token: str) -> Dict[str, Any]:
        """Validate bearer token against Supabase Auth and return profile."""
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"{self.base_url}/auth/v1/user",
                headers=self._anon_headers(token),
            )

        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        auth_user = resp.json()
        user_id = auth_user.get("id")
        return await self.get_user_profile(user_id, auth_user)


supabase_service = SupabaseService()
