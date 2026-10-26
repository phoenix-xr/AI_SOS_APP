from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel

from backend_h.core.config import settings
from backend_h.core.database import check_db_health

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    project: str
    version: str
    database: str
    timestamp: datetime


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Returns the health status of the application and database connectivity.",
)
async def health_check():
    db_connected = await check_db_health()
    return HealthResponse(
        status="healthy" if db_connected else "degraded",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        database="connected" if db_connected else "disconnected",
        timestamp=datetime.now(timezone.utc),
    )
