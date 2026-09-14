"""Habit tracking API: daily log upsert with extensible flags, range retrieval."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.deps import SessionDep
from app.models import DailyLog
from app.schemas import HabitLogCreate, HabitLogRead

router = APIRouter(prefix="/api/habits", tags=["habits"])


@router.post("", response_model=HabitLogRead)
async def upsert_habit_log(payload: HabitLogCreate, session: SessionDep) -> DailyLog:
    """Store a daily habit log; re-entering the same date updates that log (one per date)."""
    result = await session.execute(select(DailyLog).where(DailyLog.log_date == payload.log_date))
    log = result.scalar_one_or_none()
    if log is None:
        log = DailyLog(
            log_date=payload.log_date,
            exercised=payload.exercised,
            flags=payload.flags,
            note=payload.note,
        )
        session.add(log)
    else:
        log.exercised = payload.exercised
        log.flags = payload.flags
        log.note = payload.note
    await session.commit()
    return log


@router.get("", response_model=list[HabitLogRead])
async def list_habit_logs(
    session: SessionDep,
    from_date: Annotated[date, Query(alias="from")],
    to_date: Annotated[date, Query(alias="to")],
) -> list[DailyLog]:
    """Return logs within the inclusive date range ordered by date ascending."""
    result = await session.execute(
        select(DailyLog)
        .where(DailyLog.log_date >= from_date, DailyLog.log_date <= to_date)
        .order_by(DailyLog.log_date.asc())
    )
    return list(result.scalars().all())
