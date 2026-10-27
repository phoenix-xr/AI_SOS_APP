from contextlib import asynccontextmanager
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend_h.api.v1.router import api_router
from backend_h.core.config import settings
from backend_h.core.supabase import supabase_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify Supabase connectivity on startup
    connected = await supabase_service.check_health()
    if connected:
        logger.info("Connected to Supabase cloud service successfully.")
    else:
        logger.warning("Supabase cloud service is currently unreachable.")

    yield


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Set up CORS middleware
    origins = settings.ALLOWED_ORIGINS
    if isinstance(origins, str):
        origins = [origins]

    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Root endpoint
    @application.get("/", tags=["Root"])
    async def root():
        return {
            "message": f"Welcome to {settings.PROJECT_NAME}",
            "version": settings.VERSION,
            "docs": "/docs",
            "health": f"{settings.API_V1_STR}/health",
            "database": "Supabase Cloud",
        }

    # Include API router
    application.include_router(api_router, prefix=settings.API_V1_STR)

    return application


app = create_application()


def start() -> None:
    """Entry point for running the application server via CLI."""
    uvicorn.run(
        "backend_h.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )


if __name__ == "__main__":
    start()
