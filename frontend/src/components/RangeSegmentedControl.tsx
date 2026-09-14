import type { ReactElement } from "react";

/** Apple-style segmented time-range control (D / W / M / 6M / Y). */

export type ChartRange = "D" | "W" | "M" | "6M" | "Y";

export const CHART_RANGES: readonly ChartRange[] = ["D", "W", "M", "6M", "Y"];

const RANGE_MS: Readonly<Record<ChartRange, number>> = {
  D: 86_400_000,
  W: 7 * 86_400_000,
  M: 30 * 86_400_000,
  "6M": 182 * 86_400_000,
  Y: 365 * 86_400_000,
};

/** Keep only points whose timestamp falls inside the window ending now. */
export function filterByRange<T extends { readonly t: number }>(
  points: readonly T[],
  range: ChartRange,
): readonly T[] {
  const cutoff = Date.now() - RANGE_MS[range];
  return points.filter((point) => point.t >= cutoff);
}

interface RangeSegmentedControlProps {
  readonly value: ChartRange;
  readonly onChange: (range: ChartRange) => void;
  readonly label: string;
}

export function RangeSegmentedControl({
  value,
  onChange,
  label,
}: RangeSegmentedControlProps): ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-[9px] bg-fill p-[2px]"
    >
      {CHART_RANGES.map((range) => {
        const selected = range === value;
        return (
          <button
            key={range}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(range);
            }}
            className={`rounded-[7px] px-2.5 py-1 text-xs font-medium transition-colors ${
              selected
                ? "bg-card text-label shadow-sm"
                : "text-label-secondary hover:text-label"
            }`}
          >
            {range}
          </button>
        );
      })}
    </div>
  );
}
