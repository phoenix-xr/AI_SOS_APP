from contextlib import asynccontextmanager
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import backend_h.models  # noqa: F401 - ensure models are registered
from backend_h.api.v1.router import api_router
from backend_h.core.config import settings
from backend_h.core.database import Base, engine

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks: auto-create database tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.warning("Could not auto-initialize tables on startup: %s", exc)

    yield

    # Shutdown tasks: dispose engine connection pool
    await engine.dispose()


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
