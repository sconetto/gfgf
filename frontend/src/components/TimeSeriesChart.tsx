import { useId } from "react";
import type { ReactElement } from "react";

import { linearScale, niceTicks, type Pt } from "@/lib/chart";
import { formatShortDate, formatShortDateTime } from "@/lib/dates";
import { InsufficientData } from "@/components/InsufficientData";

export interface TimeSeriesPoint {
  readonly t: number;
  readonly value: number;
}

const WIDTH = 720;
const DEFAULT_ACCENT = "var(--color-ios-blue)";

interface TimeSeriesChartProps {
  /** At least 2 points, sorted by t ascending. */
  readonly points: readonly TimeSeriesPoint[];
  readonly unit: string;
  readonly valueFormat: (value: number) => string;
  readonly chartLabel: string;
  /** CSS color (token var or hex) for the line, gradient, and latest dot. */
  readonly accent?: string;
  readonly highlightLatest?: boolean;
  readonly compact?: boolean;
}

/**
 * Smooth line path through the points using monotone (Steffen) tangents —
 * gentle Apple-style curves that never overshoot the data.
 */
function smoothLinePath(points: readonly Pt[]): string {
  const n = points.length;
  const first = points[0];
  if (n < 2 || first === undefined) {
    return "";
  }
  const second = points[1];
  if (n === 2) {
    return second === undefined
      ? ""
      : `M${first.x} ${first.y} L${second.x} ${second.y}`;
  }
  const slopes: number[] = [];
  for (let i = 0; i + 1 < n; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a === undefined || b === undefined) {
      slopes.push(0);
      continue;
    }
    const dx = b.x - a.x;
    slopes.push(dx === 0 ? 0 : (b.y - a.y) / dx);
  }
  const tangents: number[] = new Array<number>(n).fill(0);
  for (let i = 1; i + 1 < n; i += 1) {
    const s1 = slopes[i - 1];
    const s2 = slopes[i];
    if (s1 === undefined || s2 === undefined) {
      continue;
    }
    tangents[i] =
      (Math.sign(s1) + Math.sign(s2)) *
      Math.min(Math.abs(s1), Math.abs(s2), Math.abs(s1 + s2) / 2);
  }
  const firstSlope = slopes[0];
  const lastSlope = slopes[n - 2];
  tangents[0] = firstSlope ?? 0;
  tangents[n - 1] = lastSlope ?? 0;
  let d = `M${first.x} ${first.y}`;
  for (let i = 0; i + 1 < n; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a === undefined || b === undefined) {
      break;
    }
    const m1 = tangents[i] ?? 0;
    const m2 = tangents[i + 1] ?? 0;
    const dx = (b.x - a.x) / 3;
    d += ` C${a.x + dx} ${a.y + m1 * dx} ${b.x - dx} ${b.y - m2 * dx} ${b.x} ${b.y}`;
  }
  return d;
}

export function TimeSeriesChart({
  points,
  unit,
  valueFormat,
  chartLabel,
  accent = DEFAULT_ACCENT,
  highlightLatest = false,
  compact = false,
}: TimeSeriesChartProps): ReactElement {
  const rawGradientId = useId();
  const gradientId = `grad-${rawGradientId.replace(/[^a-zA-Z0-9]/g, "")}`;

  if (points.length < 2) {
    return <InsufficientData message="Not enough points to draw this chart yet." />;
  }

  const height = compact ? 190 : 250;
  const padLeft = 54;
  const padRight = 18;
  const padTop = 22;
  const padBottom = 30;
  const plotWidth = WIDTH - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const tMin = Math.min(...points.map((point) => point.t));
  const tMax = Math.max(...points.map((point) => point.t));
  const tSpan = tMax - tMin;
  const xDomain: readonly [number, number] =
    tSpan === 0 ? [tMin - 43_200_000, tMax + 43_200_000] : [tMin, tMax];
  const xScale = linearScale(xDomain, [padLeft, padLeft + plotWidth]);

  let vMin = Math.min(...points.map((point) => point.value));
  let vMax = Math.max(...points.map((point) => point.value));
  const vSpan = vMax - vMin;
  if (vSpan === 0) {
    const pad = Math.max(Math.abs(vMin) * 0.1, 1);
    vMin -= pad;
    vMax += pad;
  } else {
    vMin -= vSpan * 0.08;
    vMax += vSpan * 0.08;
  }
  const yScale = linearScale([vMin, vMax], [padTop + plotHeight, padTop]);

  const yTicks = niceTicks(vMin, vMax, 4);
  const xTickCount = 4;
  const xTicks: number[] = [];
  for (let index = 0; index < xTickCount; index += 1) {
    const ratio = index / (xTickCount - 1);
    xTicks.push(xDomain[0] + (xDomain[1] - xDomain[0]) * ratio);
  }
  const formatX = tSpan < 2 * 86_400_000 ? formatShortDateTime : formatShortDate;

  const scaled: readonly Pt[] = points.map((point) => ({
    x: xScale(point.t),
    y: yScale(point.value),
  }));
  const lineD = smoothLinePath(scaled);
  const firstScaled = scaled[0];
  const lastScaled = scaled.at(-1);
  const areaBottom = padTop + plotHeight;
  const areaD =
    firstScaled === undefined || lastScaled === undefined
      ? null
      : `${lineD} L ${lastScaled.x} ${areaBottom} L ${firstScaled.x} ${areaBottom} Z`;

  const latest = points.at(-1);
  const latestLabelX =
    lastScaled === undefined
      ? padLeft
      : Math.min(Math.max(lastScaled.x, padLeft + 34), WIDTH - padRight - 34);
  const latestLabelY =
    lastScaled === undefined
      ? padTop + 12
      : Math.max(lastScaled.y - 14, padTop + 12);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label={chartLabel}
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: accent, stopOpacity: 0.2 }} />
          <stop offset="1" style={{ stopColor: accent, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <text x={padLeft} y={12} className="fill-label-tertiary text-[11px]">
        {unit}
      </text>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={padLeft}
            x2={WIDTH - padRight}
            y1={yScale(tick)}
            y2={yScale(tick)}
            className="stroke-separator"
            strokeWidth={1}
          />
          <text
            x={padLeft - 8}
            y={yScale(tick) + 4}
            textAnchor="end"
            className="fill-label-tertiary text-[11px] tabular-nums"
          >
            {valueFormat(tick)}
          </text>
        </g>
      ))}
      {xTicks.map((tick, index) => (
        <text
          key={index}
          x={xScale(tick)}
          y={height - 8}
          textAnchor="middle"
          className="fill-label-tertiary text-[11px] tabular-nums"
        >
          {formatX(tick)}
        </text>
      ))}
      {areaD === null ? null : <path d={areaD} fill={`url(#${gradientId})`} />}
      <path
        d={lineD}
        fill="none"
        style={{ stroke: accent }}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {lastScaled === undefined ? null : (
        <circle
          cx={lastScaled.x}
          cy={lastScaled.y}
          r={4.5}
          style={{ fill: "var(--color-card)", stroke: accent }}
          strokeWidth={2.5}
        />
      )}
      {highlightLatest && latest !== undefined && lastScaled !== undefined ? (
        <text
          x={latestLabelX}
          y={latestLabelY}
          textAnchor="middle"
          style={{ fill: accent }}
          className="text-[12px] font-semibold tabular-nums"
        >
          {valueFormat(latest.value)}
        </text>
      ) : null}
    </svg>
  );
}
