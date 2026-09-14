"""Health-data ingest API: tolerant bridge-app payload in, metrics out (design D7)."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy import select

from app.deps import SessionDep
from app.health_payload import IngestPayloadError, parse_health_ingest
from app.models import HealthMetric, WeightEntry
from app.schemas import IngestResponse, MetricRead

router = APIRouter(prefix="/api", tags=["health"])


@router.post("/ingest/health", response_model=IngestResponse)
async def ingest_health(request: Request, session: SessionDep) -> IngestResponse:
    """Parse and store a tolerant health payload; malformed bodies store nothing."""
    raw_body = await request.body()
    try:
        drafts = parse_health_ingest(raw_body)
    except IngestPayloadError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, exc.reason) from exc
    for draft in drafts.metrics:
        session.add(
            HealthMetric(
                metric_type=draft.metric_type,
                value=draft.value,
                unit=draft.unit,
                measured_at=draft.measured_at,
                source="ingest",
            )
        )
    for weight in drafts.weights:
        result = await session.execute(
            select(WeightEntry).where(WeightEntry.recorded_on == weight.recorded_on)
        )
        entry = result.scalar_one_or_none()
        if entry is None:
            session.add(
                WeightEntry(
                    recorded_on=weight.recorded_on,
                    weight_kg=weight.weight_kg,
                    body_fat_pct=weight.body_fat_pct,
                )
            )
        else:
            entry.weight_kg = weight.weight_kg
            entry.body_fat_pct = weight.body_fat_pct
    await session.commit()
    return IngestResponse(status="ok", ingested=len(drafts.metrics) + len(drafts.weights))


@router.get("/metrics", response_model=list[MetricRead])
async def list_metrics(
    session: SessionDep, metric_type: Annotated[str, Query(alias="type")]
) -> list[HealthMetric]:
    """Return all readings of one metric type ordered by measurement time ascending."""
    result = await session.execute(
        select(HealthMetric)
        .where(HealthMetric.metric_type == metric_type)
        .order_by(HealthMetric.measured_at.asc())
    )
    return list(result.scalars().all())
