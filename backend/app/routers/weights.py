"""Weight tracking API: daily weigh-in upsert, history, delete."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import SessionDep
from app.models import WeightEntry
from app.schemas import WeightCreate, WeightRead

router = APIRouter(prefix="/api/weights", tags=["weights"])


@router.post("", response_model=WeightRead)
async def upsert_weight(payload: WeightCreate, session: SessionDep) -> WeightEntry:
    """Store a weigh-in; re-entering the same date updates that entry (one per date)."""
    result = await session.execute(
        select(WeightEntry).where(WeightEntry.recorded_on == payload.recorded_on)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        entry = WeightEntry(
            recorded_on=payload.recorded_on,
            weight_kg=payload.weight_kg,
            body_fat_pct=payload.body_fat_pct,
            note=payload.note,
        )
        session.add(entry)
    else:
        entry.weight_kg = payload.weight_kg
        entry.body_fat_pct = payload.body_fat_pct
        entry.note = payload.note
    await session.commit()
    return entry


@router.get("", response_model=list[WeightRead])
async def list_weights(session: SessionDep) -> list[WeightEntry]:
    """Return every weigh-in ordered by date ascending."""
    result = await session.execute(select(WeightEntry).order_by(WeightEntry.recorded_on.asc()))
    return list(result.scalars().all())


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_weight(entry_id: int, session: SessionDep) -> None:
    """Remove a weigh-in by id; 404 when it does not exist."""
    result = await session.execute(select(WeightEntry).where(WeightEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "weight entry not found")
    await session.delete(entry)
    await session.commit()
