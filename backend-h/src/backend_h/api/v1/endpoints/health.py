from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel

from backend_h.core.config import settings
from backend_h.core.supabase import supabase_service

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
    description="Returns the health status of the application and Supabase connectivity.",
)
async def health_check():
    supabase_connected = await supabase_service.check_health()
    return HealthResponse(
        status="healthy" if supabase_connected else "degraded",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        database="supabase_connected" if supabase_connected else "supabase_unreachable",
        timestamp=datetime.now(timezone.utc),
    )
