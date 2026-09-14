"use client";

import { useId, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactElement } from "react";

import type { CorrelationPoint } from "@/lib/correlation";
import {
  clamp,
  linePath,
  linearRegression,
  linearScale,
  niceTicks,
} from "@/lib/chart";
import { formatShortDate } from "@/lib/dates";
import { formatLapTime } from "@/lib/laptime";
import {
  CHART_HEIGHT_REGULAR,
  CHART_PAD_BOTTOM,
  CHART_PAD_LEFT,
  CHART_PAD_RIGHT,
  CHART_PAD_TOP,
  CHART_WIDTH,
  estimateTextWidth,
} from "@/components/chartFrame";
import { ChartTooltip } from "@/components/ChartTooltip";
import { InsufficientData } from "@/components/InsufficientData";

interface CorrelationChartProps {
  /** At least 2 points, sorted by lapDate ascending. */
  readonly points: readonly CorrelationPoint[];
  readonly trackName: string;
}

/* Date color scale (3rd axis): oldest race day → muted slate, newest → iOS green. */
const OLDEST_RGB: readonly [number, number, number] = [176, 182, 189];
const NEWEST_RGB: readonly [number, number, number] = [52, 199, 89];

/** Pure helper: interpolate muted → green for a normalized date in [0, 1]. */
function dateColor(normalized: number): string {
  const t = clamp(normalized, 0, 1);
  const [rOld, gOld, bOld] = OLDEST_RGB;
  const [rNew, gNew, bNew] = NEWEST_RGB;
  const r = Math.round(rOld + (rNew - rOld) * t);
  const g = Math.round(gOld + (gNew - gOld) * t);
  const b = Math.round(bOld + (bNew - bOld) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function CorrelationChart({
  points,
  trackName,
}: CorrelationChartProps): ReactElement {
  const rawGradientId = useId();
  const dateGradientId = `dategrad-${rawGradientId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <InsufficientData message="Not enough paired race days to draw this chart yet." />
    );
  }

  const height = CHART_HEIGHT_REGULAR;
  const padLeft = CHART_PAD_LEFT;
  const padRight = CHART_PAD_RIGHT;
  const padTop = CHART_PAD_TOP;
  const padBottom = CHART_PAD_BOTTOM;
  const plotWidth = CHART_WIDTH - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  let xMin = Math.min(...points.map((point) => point.weightKg));
  let xMax = Math.max(...points.map((point) => point.weightKg));
  const xSpan = xMax - xMin;
  if (xSpan === 0) {
    xMin -= 0.5;
    xMax += 0.5;
  } else {
    xMin -= xSpan * 0.08;
    xMax += xSpan * 0.08;
  }
  let yMin = Math.min(...points.map((point) => point.bestTimeMs));
  let yMax = Math.max(...points.map((point) => point.bestTimeMs));
  const ySpan = yMax - yMin;
  if (ySpan === 0) {
    yMin -= 500;
    yMax += 500;
  } else {
    yMin -= ySpan * 0.08;
    yMax += ySpan * 0.08;
  }

  const xScale = linearScale([xMin, xMax], [padLeft, padLeft + plotWidth]);
  const yScale = linearScale([yMin, yMax], [padTop + plotHeight, padTop]);
  const xTicks = niceTicks(xMin, xMax, 5);
  const yTicks = niceTicks(yMin, yMax, 4);

  const fit = linearRegression(
    points.map((point) => ({ x: point.weightKg, y: point.bestTimeMs })),
  );
  let trendPath: string | null = null;
  if (fit !== null) {
    const yAt = (x: number): number =>
      clamp(fit.slope * x + fit.intercept, yMin, yMax);
    trendPath = linePath([
      { x: xScale(xMin), y: yScale(yAt(xMin)) },
      { x: xScale(xMax), y: yScale(yAt(xMax)) },
    ]);
  }

  const scaled = points.map((point) => ({
    x: xScale(point.weightKg),
    y: yScale(point.bestTimeMs),
  }));
  const connectorPath = linePath(scaled);

  // Date normalization for the color scale (points are date-ascending).
  const dateMs = points.map((point) => Date.parse(point.lapDate));
  const dateMin = Math.min(...dateMs);
  const dateMax = Math.max(...dateMs);
  const dateSpan = dateMax - dateMin;
  const normalizedDate = (ms: number): number =>
    dateSpan === 0 ? 1 : (ms - dateMin) / dateSpan;

  // Legend (top-right, same band as the unit label): earliest ⟷ latest date.
  const firstPoint = points[0];
  const lastPoint = points.at(-1);
  const legendFont = 12;
  const legendBarWidth = 72;
  const legendGap = 6;
  const earliestText =
    firstPoint === undefined ? "" : formatShortDate(Date.parse(firstPoint.lapDate));
  const latestText =
    lastPoint === undefined ? "" : formatShortDate(Date.parse(lastPoint.lapDate));
  const latestTextWidth = estimateTextWidth(latestText, legendFont);
  const legendBarRight = CHART_WIDTH - padRight - latestTextWidth - legendGap;
  const legendBarLeft = legendBarRight - legendBarWidth;
  const earliestTextX = legendBarLeft - legendGap;

  const formatKg = (value: number): string => String(Math.round(value * 10) / 10);

  function handleMouseMove(event: ReactMouseEvent<SVGSVGElement>): void {
    const svg = svgRef.current;
    if (svg === null) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const pointerX = ((event.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const pointerY = ((event.clientY - rect.top) / rect.height) * height;
    let nearest: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < scaled.length; index += 1) {
      const candidate = scaled[index];
      if (candidate === undefined) {
        continue;
      }
      const dx = candidate.x - pointerX;
      const dy = candidate.y - pointerY;
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    }
    setHoveredIndex((current) => (current === nearest ? current : nearest));
  }

  const hoveredScaled = hoveredIndex === null ? undefined : scaled[hoveredIndex];
  const hoveredPoint = hoveredIndex === null ? undefined : points[hoveredIndex];
  const hoveredColor =
    hoveredPoint === undefined
      ? dateColor(1)
      : dateColor(normalizedDate(Date.parse(hoveredPoint.lapDate)));

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CHART_WIDTH} ${height}`}
      role="img"
      aria-label={`Weight in kilograms versus best lap time at ${trackName} — one point per race day, colored from oldest to newest`}
      className="h-auto w-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredIndex(null);
      }}
    >
      <defs>
        <linearGradient id={dateGradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={dateColor(0)} />
          <stop offset="1" stopColor={dateColor(1)} />
        </linearGradient>
      </defs>
      <text x={padLeft} y={12} className="fill-label-tertiary text-[13px]">
        best lap · by weight (kg)
      </text>
      {firstPoint === undefined ? null : (
        <g>
          <text
            x={earliestTextX}
            y={12}
            textAnchor="end"
            className="fill-label-tertiary text-[12px] tabular-nums"
          >
            {earliestText}
          </text>
          <rect
            x={legendBarLeft}
            y={6}
            width={legendBarWidth}
            height={6}
            rx={2.5}
            fill={`url(#${dateGradientId})`}
          />
          <text
            x={CHART_WIDTH - padRight}
            y={12}
            textAnchor="end"
            className="fill-label-tertiary text-[12px] tabular-nums"
          >
            {latestText}
          </text>
        </g>
      )}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={padLeft}
            x2={CHART_WIDTH - padRight}
            y1={yScale(tick)}
            y2={yScale(tick)}
            className="stroke-separator"
            strokeWidth={1}
          />
          <text
            x={padLeft - 8}
            y={yScale(tick) + 4}
            textAnchor="end"
            className="fill-label-tertiary text-[13px] tabular-nums"
          >
            {formatLapTime(Math.round(tick))}
          </text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <text
          key={tick}
          x={xScale(tick)}
          y={height - 8}
          textAnchor="middle"
          className="fill-label-tertiary text-[13px] tabular-nums"
        >
          {formatKg(tick)}
        </text>
      ))}
      {trendPath === null ? null : (
        <path
          d={trendPath}
          fill="none"
          className="stroke-ios-green"
          strokeWidth={2}
          strokeDasharray="6 5"
        />
      )}
      <path
        d={connectorPath}
        fill="none"
        className="stroke-separator-strong"
        strokeWidth={1}
        strokeDasharray="2 4"
        opacity={0.5}
      />
      {points.map((point, index) => {
        const position = scaled[index];
        if (position === undefined) {
          return null;
        }
        const isLatest = index === points.length - 1;
        const fill = dateColor(normalizedDate(Date.parse(point.lapDate)));
        return (
          <circle
            key={`${point.lapDate}-${index}`}
            cx={position.x}
            cy={position.y}
            r={isLatest ? 5.5 : 4}
            style={{ fill }}
            className="stroke-card"
            strokeWidth={isLatest ? 2.5 : 1.5}
          />
        );
      })}
      {hoveredScaled === undefined || hoveredPoint === undefined ? null : (
        <g pointerEvents="none">
          <circle
            cx={hoveredScaled.x}
            cy={hoveredScaled.y}
            r={7.5}
            fill="none"
            style={{ stroke: hoveredColor }}
            strokeWidth={2}
          />
          <ChartTooltip
            anchorX={hoveredScaled.x}
            anchorY={hoveredScaled.y}
            title={formatLapTime(hoveredPoint.bestTimeMs)}
            subtitle={`${hoveredPoint.weightKg.toFixed(1)} kg · ${hoveredPoint.lapDate}`}
            minX={padLeft}
            maxX={CHART_WIDTH - padRight}
            minY={padTop}
            maxY={padTop + plotHeight}
          />
        </g>
      )}
    </svg>
  );
}
