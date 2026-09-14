import type { ReactElement } from "react";

import { MetricGlyph, metricAccent, type MetricKey } from "@/components/metricTheme";

/** Apple Health "Favorites" tile: accent badge + label + large value + unit. */

interface FavoriteTileProps {
  readonly label: string;
  readonly metric: MetricKey;
  readonly value: string | null;
  readonly unit: string;
}

export function FavoriteTile({
  label,
  metric,
  value,
  unit,
}: FavoriteTileProps): ReactElement {
  const accent = metricAccent(metric);
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[12px] border border-separator bg-card p-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-white"
          style={{ backgroundColor: accent }}
          aria-hidden="true"
        >
          <MetricGlyph metric={metric} className="h-4 w-4" />
        </span>
        <span className="truncate text-[13px] font-medium text-label-secondary">
          {label}
        </span>
      </div>
      <p className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-label">
          {value ?? "—"}
        </span>
        {value === null || unit === "" ? null : (
          <span className="text-[13px] text-label-secondary">{unit}</span>
        )}
      </p>
    </div>
  );
}
