from datetime import datetime
from typing import Optional, Union
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=4, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: Union[str, int]
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "user"
    is_active: bool = True
    created_at: Optional[Union[datetime, str]] = None
