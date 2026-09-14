import type { ReactElement } from "react";

import type { CorrelationPoint } from "@/lib/correlation";
import {
  clamp,
  linePath,
  linearRegression,
  linearScale,
  niceTicks,
} from "@/lib/chart";
import { formatLapTime } from "@/lib/laptime";
import { InsufficientData } from "@/components/InsufficientData";

const WIDTH = 720;
const HEIGHT = 280;

interface CorrelationChartProps {
  /** At least 2 points, sorted by lapDate ascending. */
  readonly points: readonly CorrelationPoint[];
  readonly trackName: string;
}

export function CorrelationChart({
  points,
  trackName,
}: CorrelationChartProps): ReactElement {
  if (points.length < 2) {
    return (
      <InsufficientData message="Not enough paired race days to draw this chart yet." />
    );
  }

  const padLeft = 68;
  const padRight = 20;
  const padTop = 26;
  const padBottom = 46;
  const plotWidth = WIDTH - padLeft - padRight;
  const plotHeight = HEIGHT - padTop - padBottom;

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

  const formatKg = (value: number): string => String(Math.round(value * 10) / 10);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Weight in kilograms versus best lap time at ${trackName} — one point per race day`}
      className="h-auto w-full"
    >
      <text x={2} y={14} className="fill-label-tertiary text-[11px]">
        best lap
      </text>
      <text
        x={padLeft + plotWidth / 2}
        y={HEIGHT - 4}
        textAnchor="middle"
        className="fill-label-tertiary text-[11px]"
      >
        weight (kg)
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
            {formatLapTime(Math.round(tick))}
          </text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <text
          key={tick}
          x={xScale(tick)}
          y={HEIGHT - 22}
          textAnchor="middle"
          className="fill-label-tertiary text-[11px] tabular-nums"
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
      {points.map((point, index) => {
        const isLatest = index === points.length - 1;
        return (
          <circle
            key={`${point.lapDate}-${index}`}
            cx={xScale(point.weightKg)}
            cy={yScale(point.bestTimeMs)}
            r={isLatest ? 5.5 : 4}
            className="fill-ios-green stroke-card"
            strokeWidth={isLatest ? 2.5 : 1.5}
          >
            <title>{`${point.lapDate} — ${point.weightKg} kg · ${formatLapTime(point.bestTimeMs)}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}
