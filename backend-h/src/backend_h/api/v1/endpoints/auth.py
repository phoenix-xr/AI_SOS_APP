from typing import Annotated, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend_h.core.supabase import supabase_service
from backend_h.schemas.auth import LoginRequest, TokenResponse
from backend_h.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["Authentication"])

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
) -> Dict[str, Any]:
    """Dependency that extracts and validates the Bearer token with Supabase and loads the user."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    return await supabase_service.get_user_from_token(token)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(user_in: UserCreate) -> TokenResponse:
    """Create a new user account in Supabase and return access token + profile."""
    result = await supabase_service.register(
        username=user_in.username,
        email=user_in.email,
        password=user_in.password,
        full_name=user_in.full_name,
    )

    return TokenResponse(
        access_token=result["access_token"],
        token_type=result.get("token_type", "bearer"),
        user=UserRead.model_validate(result["user"]),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and obtain JWT token",
)
async def login(login_data: LoginRequest) -> TokenResponse:
    """Log in using username or email and password against Supabase."""
    result = await supabase_service.login(
        username_or_email=login_data.username,
        password=login_data.password,
    )

    return TokenResponse(
        access_token=result["access_token"],
        token_type=result.get("token_type", "bearer"),
        user=UserRead.model_validate(result["user"]),
    )


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get profile of the currently authenticated user",
)
async def get_me(
    current_user: Annotated[Dict[str, Any], Depends(get_current_user)],
) -> UserRead:
    """Return user data for the holder of the valid Supabase JWT access token."""
    return UserRead.model_validate(current_user)
