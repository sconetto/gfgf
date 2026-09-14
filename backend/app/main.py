"""FastAPI application factory and health endpoint."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated, ClassVar, Literal

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from app import db
from app.config import get_settings
from app.models import Base


class HealthResponse(BaseModel):
    """GET /health response body."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    status: Literal["ok"]
    db: Literal["ok"]


async def get_db_status() -> Literal["ok"]:
    """Prove database connectivity with a SELECT 1 round-trip.

    Overridden in tests to fake the database dependency.
    """
    await db.ping()
    return "ok"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
    """Create the engine, idempotently ensure the schema exists, clean up."""
    engine = db.init_engine(get_settings())
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield
    await db.dispose_engine()


def create_app() -> FastAPI:
    """Build the FastAPI application."""
    application = FastAPI(title="gfgf backend", lifespan=lifespan)

    # LAN-only, no auth, no cookies (design D6): permissive CORS is deliberate
    # so the browser page can call the API from any host/port it is served on.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=False,
    )

    @application.get("/health", response_model=HealthResponse, tags=["health"])
    async def health(
        db_status: Annotated[Literal["ok"], Depends(get_db_status)],
    ) -> HealthResponse:
        return HealthResponse(status="ok", db=db_status)

    return application


app = create_app()
