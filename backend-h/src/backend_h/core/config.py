from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    PROJECT_NAME: str = "HealthMitra API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    ALLOWED_ORIGINS: Union[List[str], str] = ["*"]

    # Supabase Cloud Settings
    SUPABASE_URL: str = "https://ntdjwxibywpyfsdoufcy.supabase.co"
    SUPABASE_PUBLISHABLE_KEY: str = "sb_publishable_cIdE-Uhw87LSneTqBly2mA_kpHcVF50"
    SUPABASE_SECRET_KEY: Optional[str] = None
    SUPABASE_JWKS_URL: Optional[str] = None

    # JWT settings
    JWT_SECRET: str = "e932b1d30560938f42a781b2a95c4791dc0f4553b3fecbb072d6ca0495f3a027"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return v


settings = Settings()
