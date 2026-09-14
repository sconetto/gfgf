"""Shared FastAPI dependencies."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app import db


async def get_session() -> AsyncGenerator[AsyncSession]:
    """Yield an async session bound to the app engine; commits are the caller's job."""
    async with AsyncSession(db.get_engine(), expire_on_commit=False) as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]
