"use client";

import { useId, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactElement } from "react";

import { linearScale, niceTicks, clamp, type Pt } from "@/lib/chart";
import { formatShortDate, formatShortDateTime } from "@/lib/dates";
import type { MetricThresholds } from "@/lib/metrics";
import {
  CHART_HEIGHT_COMPACT,
  CHART_HEIGHT_REGULAR,
  CHART_PAD_BOTTOM,
  CHART_PAD_LEFT,
  CHART_PAD_LEFT_COMPACT,
  CHART_PAD_RIGHT,
  CHART_PAD_RIGHT_COMPACT,
  CHART_PAD_TOP,
  CHART_WIDTH,
  CHART_WIDTH_COMPACT,
  estimateTextWidth,
} from "@/components/chartFrame";
import { ChartTooltip } from "@/components/ChartTooltip";
import { InsufficientData } from "@/components/InsufficientData";

export interface TimeSeriesPoint {
  readonly t: number;
  readonly value: number;
}

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
  /**
   * Healthy-range bounds. When both are present a band is drawn behind the
   * line; when only one is present a dashed line marks the bound.
   */
  readonly thresholds?: MetricThresholds | undefined;
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
  thresholds,
}: TimeSeriesChartProps): ReactElement {
  const rawGradientId = useId();
  const gradientId = `grad-${rawGradientId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [thresholdHovered, setThresholdHovered] = useState(false);

  if (points.length < 2) {
    return <InsufficientData message="Not enough points to draw this chart yet." />;
  }

  const height = compact ? CHART_HEIGHT_COMPACT : CHART_HEIGHT_REGULAR;
  const width = compact ? CHART_WIDTH_COMPACT : CHART_WIDTH;
  const padLeft = compact ? CHART_PAD_LEFT_COMPACT : CHART_PAD_LEFT;
  const padRight = compact ? CHART_PAD_RIGHT_COMPACT : CHART_PAD_RIGHT;
  const padTop = CHART_PAD_TOP;
  const padBottom = CHART_PAD_BOTTOM;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const tMin = Math.min(...points.map((point) => point.t));
  const tMax = Math.max(...points.map((point) => point.t));
  const tSpan = tMax - tMin;
  const xDomain: readonly [number, number] =
    tSpan === 0 ? [tMin - 43_200_000, tMax + 43_200_000] : [tMin, tMax];
  const xScale = linearScale(xDomain, [padLeft, padLeft + plotWidth]);

  let vMin = Math.min(...points.map((point) => point.value));
  let vMax = Math.max(...points.map((point) => point.value));
  if (thresholds?.min !== undefined) {
    vMin = Math.min(vMin, thresholds.min);
  }
  if (thresholds?.max !== undefined) {
    vMax = Math.max(vMax, thresholds.max);
  }
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

  const thresholdMin = thresholds?.min;
  const thresholdMax = thresholds?.max;
  const bandRect =
    thresholdMin !== undefined && thresholdMax !== undefined
      ? {
          y: yScale(thresholdMax),
          height: Math.max(yScale(thresholdMin) - yScale(thresholdMax), 0),
        }
      : null;
  const thresholdLineY =
    bandRect === null && thresholdMin !== undefined
      ? yScale(thresholdMin)
      : bandRect === null && thresholdMax !== undefined
        ? yScale(thresholdMax)
        : null;

  const thresholdLabel =
    thresholdMin !== undefined && thresholdMax !== undefined
      ? `healthy ${valueFormat(thresholdMin)}–${valueFormat(thresholdMax)}`
      : thresholdMin !== undefined
        ? `healthy ≥ ${valueFormat(thresholdMin)}`
        : thresholdMax !== undefined
          ? `healthy ≤ ${valueFormat(thresholdMax)}`
          : null;

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
      : Math.min(Math.max(lastScaled.x, padLeft + 34), width - padRight - 34);
  const latestLabelY =
    lastScaled === undefined
      ? padTop + 12
      : Math.max(lastScaled.y - 14, padTop + 12);

  function handleMouseMove(event: ReactMouseEvent<SVGSVGElement>): void {
    const svg = svgRef.current;
    if (svg === null) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const pointerX = ((event.clientX - rect.left) / rect.width) * width;
    let nearest: number | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < scaled.length; index += 1) {
      const candidate = scaled[index];
      if (candidate === undefined) {
        continue;
      }
      const distance = Math.abs(candidate.x - pointerX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    }
    setHoveredIndex((current) => (current === nearest ? current : nearest));
  }

  const hoveredScaled = hoveredIndex === null ? undefined : scaled[hoveredIndex];
  const hoveredPoint = hoveredIndex === null ? undefined : points[hoveredIndex];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={chartLabel}
      className={
        compact ? "mx-auto h-auto w-full max-w-[420px]" : "h-auto w-full"
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredIndex(null);
      }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: accent, stopOpacity: 0.2 }} />
          <stop offset="1" style={{ stopColor: accent, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <text x={padLeft} y={12} className="fill-label-tertiary text-[13px]">
        {unit}
      </text>
      {thresholdLabel === null ? null : (
        <text
          x={width - padRight}
          y={12}
          textAnchor="end"
          className="fill-ios-green text-[13px] font-medium tabular-nums"
          onMouseEnter={() => {
            setThresholdHovered(true);
          }}
          onMouseLeave={() => {
            setThresholdHovered(false);
          }}
          style={{ cursor: "help" }}
        >
          {thresholdLabel}
        </text>
      )}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={padLeft}
            x2={width - padRight}
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
          className="fill-label-tertiary text-[13px] tabular-nums"
        >
          {formatX(tick)}
        </text>
      ))}
      {bandRect === null ? null : (
        <rect
          x={padLeft}
          y={bandRect.y}
          width={width - padLeft - padRight}
          height={bandRect.height}
          className="fill-ios-green/15"
        />
      )}
      {thresholdLineY === null ? null : (
        <line
          x1={padLeft}
          x2={width - padRight}
          y1={thresholdLineY}
          y2={thresholdLineY}
          className="stroke-ios-green"
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />
      )}
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
          className="text-[14px] font-semibold tabular-nums"
        >
          {valueFormat(latest.value)}
        </text>
      ) : null}
      {hoveredScaled === undefined || hoveredPoint === undefined ? null : (
        <g pointerEvents="none">
          <line
            x1={hoveredScaled.x}
            x2={hoveredScaled.x}
            y1={padTop}
            y2={areaBottom}
            className="stroke-separator-strong"
            strokeWidth={1}
          />
          <circle
            cx={hoveredScaled.x}
            cy={hoveredScaled.y}
            r={4.5}
            style={{ fill: accent, stroke: "var(--color-card)" }}
            strokeWidth={2}
          />
          <ChartTooltip
            anchorX={hoveredScaled.x}
            anchorY={hoveredScaled.y}
            title={valueFormat(hoveredPoint.value)}
            subtitle={formatX(hoveredPoint.t)}
            minX={padLeft}
            maxX={width - padRight}
            minY={padTop}
            maxY={padTop + plotHeight}
          />
        </g>
      )}
      {thresholdLabel === null || !thresholdHovered ? null : (
        <ThresholdCitation
          label={thresholdLabel}
          source={thresholds?.source}
          note={thresholds?.note}
          anchorX={width - padRight}
          minX={padLeft}
          maxX={width - padRight}
        />
      )}
    </svg>
  );
}

function wrapText(text: string, maxWidth: number, fontSize: number): readonly string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current !== "") {
        lines.push(current);
      }
      current = word;
    }
  }
  if (current !== "") {
    lines.push(current);
  }
  return lines;
}

function ThresholdCitation({
  label,
  source,
  note,
  anchorX,
  minX,
  maxX,
}: {
  readonly label: string;
  readonly source: string | undefined;
  readonly note: string | undefined;
  readonly anchorX: number;
  readonly minX: number;
  readonly maxX: number;
}): ReactElement {
  const boxMaxWidth = 300;
  const padX = 12;
  const noteLines =
    note === undefined ? [] : wrapText(note, boxMaxWidth - padX * 2, 13);
  const sourceLines =
    source === undefined
      ? []
      : wrapText(`Source: ${source}`, boxMaxWidth - padX * 2, 12);
  const lines: readonly { readonly text: string; readonly size: number }[] = [
    { text: label, size: 14 },
    ...noteLines.map((line) => ({ text: line, size: 13 })),
    ...sourceLines.map((line) => ({ text: line, size: 12 })),
  ];
  const lineHeight = 18;
  const boxWidth = Math.min(
    boxMaxWidth,
    Math.max(...lines.map((line) => estimateTextWidth(line.text, line.size))) +
      padX * 2,
  );
  const boxHeight = lines.length * lineHeight + 16;
  let boxX = anchorX - boxWidth;
  boxX = clamp(boxX, minX, maxX - boxWidth);
  const boxY = 22;

  return (
    <g pointerEvents="none">
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={10}
        className="fill-card stroke-separator-strong"
        strokeWidth={1}
        style={{ filter: "drop-shadow(0 2px 6px rgb(0 0 0 / 0.15))" }}
      />
      {lines.map((line, index) => {
        const isLabel = index === 0;
        const isSource = source !== undefined && index >= lines.length - sourceLines.length;
        return (
          <text
            key={index}
            x={boxX + padX}
            y={boxY + 15 + index * lineHeight}
            className={
              isLabel
                ? "fill-ios-green font-semibold tabular-nums"
                : isSource
                  ? "fill-label-secondary tabular-nums"
                  : "fill-label"
            }
            style={{ fontSize: line.size }}
          >
            {line.text}
          </text>
        );
      })}
    </g>
  );
}
