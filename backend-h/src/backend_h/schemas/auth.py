from pydantic import BaseModel, Field
from backend_h.schemas.user import UserRead


class LoginRequest(BaseModel):
    """Login payload supporting either username or email in the username field."""
    username: str = Field(..., description="Username or email address")
    password: str = Field(..., min_length=1, description="Account password")


class TokenResponse(BaseModel):
    """JWT Token response returned upon successful authentication."""
    access_token: str
    token_type: str = "bearer"
    user: UserRead
