"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import type { WeightRead } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { InsufficientData } from "@/components/InsufficientData";
import { Panel } from "@/components/Panel";
import {
  RangeSegmentedControl,
  filterByRange,
  type ChartRange,
} from "@/components/RangeSegmentedControl";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { metricAccent } from "@/components/metricTheme";

interface WeightTrendChartProps {
  /** Weigh-ins ordered by date ascending (as the API returns them). */
  readonly weights: readonly WeightRead[];
}

export function WeightTrendChart({ weights }: WeightTrendChartProps): ReactElement {
  const [range, setRange] = useState<ChartRange>("Y");
  const visible = filterByRange(
    weights.map((weight) => ({ t: Date.parse(weight.recorded_on), weight })),
    range,
  );
  const latest = visible.at(-1)?.weight;
  const first = visible.at(0)?.weight;
  return (
    <Panel
      title="Weight"
      meta={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-label-tertiary">
            {weights.length} {weights.length === 1 ? "entry" : "entries"}
          </span>
          <RangeSegmentedControl
            value={range}
            onChange={setRange}
            label="Weight chart time range"
          />
        </div>
      }
    >
      {weights.length === 0 ? (
        <InsufficientData
          message="No weigh-ins yet"
          hint="Log your first weigh-in to start the trend."
        />
      ) : visible.length === 0 || latest === undefined ? (
        <InsufficientData
          message="No weigh-ins in this range"
          hint="Try a wider range."
        />
      ) : visible.length === 1 ? (
        <div className="flex flex-col gap-3">
          <LatestWeight latest={latest} />
          <InsufficientData
            message="Only one weigh-in in this range"
            hint="A second day draws the trend line."
          />
        </div>
      ) : first === undefined ? (
        <InsufficientData
          message="No weigh-ins in this range"
          hint="Try a wider range."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <LatestWeight latest={latest} first={first} />
          <TimeSeriesChart
            points={visible.map(({ t, weight }) => ({ t, value: weight.weight_kg }))}
            unit="kg"
            valueFormat={(value) => value.toFixed(1)}
            accent={metricAccent("weight")}
            highlightLatest
            chartLabel={`Weight in kilograms from ${first.recorded_on} to ${latest.recorded_on}`}
          />
        </div>
      )}
    </Panel>
  );
}

function LatestWeight({
  latest,
  first,
}: {
  readonly latest: WeightRead;
  readonly first?: WeightRead | undefined;
}): ReactElement {
  const delta = first === undefined ? 0 : latest.weight_kg - first.weight_kg;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-label">
        {latest.weight_kg.toFixed(1)}
      </span>
      <span className="text-sm text-label-secondary">
        kg · {formatShortDate(Date.parse(latest.recorded_on))}
      </span>
      {first === undefined || delta === 0 ? null : (
        <span
          className={`text-sm font-medium tabular-nums ${
            delta < 0 ? "text-ios-green" : "text-ios-red"
          }`}
        >
          {delta < 0 ? "−" : "+"}
          {Math.abs(delta).toFixed(1)} kg in range
        </span>
      )}
    </div>
  );
}
