import type { ReactElement } from "react";

import { clamp } from "@/lib/chart";
import { estimateTextWidth } from "@/components/chartFrame";

interface ChartTooltipProps {
  /** Anchor point (the hovered data point) in viewBox units. */
  readonly anchorX: number;
  readonly anchorY: number;
  /** Primary line — the value. */
  readonly title: string;
  /** Secondary line — the date/context. */
  readonly subtitle: string;
  /** Plot-area clamp bounds in viewBox units. */
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

/** Apple-clean hover tooltip: card-colored rounded box, clamped to the plot. */
export function ChartTooltip({
  anchorX,
  anchorY,
  title,
  subtitle,
  minX,
  maxX,
  minY,
  maxY,
}: ChartTooltipProps): ReactElement {
  const padX = 9;
  const boxHeight = 44;
  const offset = 12;
  const boxWidth =
    Math.max(estimateTextWidth(title, 13), estimateTextWidth(subtitle, 12)) +
    padX * 2;

  // Prefer the box to the right of the anchor; flip left when it would
  // overflow, then clamp so it never leaves the plot bounds.
  let boxX = anchorX + offset;
  if (boxX + boxWidth > maxX) {
    boxX = anchorX - offset - boxWidth;
  }
  boxX = clamp(boxX, Math.min(minX, maxX - boxWidth), maxX - boxWidth);

  // Prefer above the anchor; flip below when it would overflow the top.
  let boxY = anchorY - boxHeight - offset;
  if (boxY < minY) {
    boxY = anchorY + offset;
  }
  boxY = clamp(boxY, Math.min(minY, maxY - boxHeight), maxY - boxHeight);

  return (
    <g pointerEvents="none">
      <rect
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={9}
        className="fill-card stroke-separator"
        strokeWidth={1}
      />
      <text
        x={boxX + padX}
        y={boxY + 18}
        className="fill-label text-[13px] font-semibold tabular-nums"
      >
        {title}
      </text>
      <text
        x={boxX + padX}
        y={boxY + 34}
        className="fill-label-secondary text-[12px] tabular-nums"
      >
        {subtitle}
      </text>
    </g>
  );
}
