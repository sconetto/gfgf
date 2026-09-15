"""Single-user profile API: read and upsert the one profile row (design D9)."""

from fastapi import APIRouter
from sqlalchemy import select

from app.deps import SessionDep
from app.models import Profile
from app.schemas import ProfileCreate, ProfileRead

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=ProfileRead | None)
async def get_profile(session: SessionDep) -> Profile | None:
    """Return the profile, or null when none has been saved yet."""
    result = await session.execute(select(Profile).order_by(Profile.id.asc()).limit(1))
    return result.scalar_one_or_none()


@router.put("", response_model=ProfileRead)
async def upsert_profile(payload: ProfileCreate, session: SessionDep) -> Profile:
    """Store the profile; the single existing row is updated on every save."""
    result = await session.execute(select(Profile).order_by(Profile.id.asc()).limit(1))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = Profile(
            age_years=payload.age_years,
            sex=payload.sex,
            height_cm=payload.height_cm,
            activity_level=payload.activity_level,
        )
        session.add(profile)
    else:
        profile.age_years = payload.age_years
        profile.sex = payload.sex
        profile.height_cm = payload.height_cm
        profile.activity_level = payload.activity_level
    await session.commit()
    return profile
