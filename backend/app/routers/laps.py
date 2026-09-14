"""Lap tracking API: record laps, list per track, derive bests (design D4)."""

from datetime import date

from fastapi import APIRouter, status
from sqlalchemy import select

from app.deps import SessionDep
from app.models import LapTime
from app.schemas import LapCreate, LapRead, PersonalBestRead, SessionBestRead

router = APIRouter(prefix="/api/laps", tags=["laps"])


@router.post("", response_model=LapRead, status_code=status.HTTP_201_CREATED)
async def create_lap(payload: LapCreate, session: SessionDep) -> LapTime:
    """Store one lap; every lap is kept and bests are derived at query time."""
    lap = LapTime(
        track_name=payload.track_name,
        time_ms=payload.time_ms,
        lap_date=payload.lap_date,
        kart_class=payload.kart_class,
        note=payload.note,
    )
    session.add(lap)
    await session.commit()
    return lap


@router.get("", response_model=list[LapRead])
async def list_laps(session: SessionDep, track: str | None = None) -> list[LapTime]:
    """List laps, optionally filtered by track, ordered by date ascending."""
    query = select(LapTime).order_by(LapTime.lap_date.asc(), LapTime.id.asc())
    if track is not None:
        query = query.where(LapTime.track_name == track)
    result = await session.execute(query)
    return list(result.scalars().all())


@router.get("/personal-bests", response_model=list[PersonalBestRead])
async def personal_bests(session: SessionDep) -> list[PersonalBestRead]:
    """Lifetime best (minimum) lap time per track."""
    result = await session.execute(select(LapTime))
    bests: dict[str, int] = {}
    for lap in result.scalars():
        current = bests.get(lap.track_name)
        if current is None or lap.time_ms < current:
            bests[lap.track_name] = lap.time_ms
    return [
        PersonalBestRead(track_name=track, best_time_ms=best)
        for track, best in sorted(bests.items())
    ]


@router.get("/session-bests", response_model=list[SessionBestRead])
async def session_bests(session: SessionDep) -> list[SessionBestRead]:
    """Best (minimum) lap time per track per day."""
    result = await session.execute(select(LapTime))
    bests: dict[tuple[str, date], int] = {}
    for lap in result.scalars():
        key = (lap.track_name, lap.lap_date)
        current = bests.get(key)
        if current is None or lap.time_ms < current:
            bests[key] = lap.time_ms
    return [
        SessionBestRead(track_name=track, lap_date=day, best_time_ms=best)
        for (track, day), best in sorted(bests.items())
    ]
