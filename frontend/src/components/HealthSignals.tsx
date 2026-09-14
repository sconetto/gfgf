"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import type { MetricRead } from "@/lib/api";
import {
  METRIC_SIGNALS,
  formatMetricValue,
  type MetricSignalMeta,
  type MetricsBundle,
} from "@/lib/metrics";
import { InsufficientData } from "@/components/InsufficientData";
import {
  RangeSegmentedControl,
  filterByRange,
  type ChartRange,
} from "@/components/RangeSegmentedControl";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { MetricGlyph, metricAccent } from "@/components/metricTheme";

export type HealthSignalsState =
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly data: MetricsBundle }
  | { readonly kind: "error"; readonly message: string };

interface HealthSignalsProps {
  readonly state: HealthSignalsState;
}

export function HealthSignals({ state }: HealthSignalsProps): ReactElement {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="health-heading">
      <h2 id="health-heading" className="text-xl font-bold text-label">
        Health Signals
      </h2>
      {state.kind === "loading" ? (
        <p className="px-1 py-8 text-center text-sm text-label-tertiary">loading…</p>
      ) : state.kind === "error" ? (
        <p className="px-1 py-8 text-center text-sm text-ios-red">{state.message}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {METRIC_SIGNALS.map((meta) => (
            <SignalCard key={meta.type} meta={meta} metrics={state.data[meta.type]} />
          ))}
        </div>
      )}
    </section>
  );
}

function SignalCard({
  meta,
  metrics,
}: {
  readonly meta: MetricSignalMeta;
  readonly metrics: readonly MetricRead[];
}): ReactElement {
  const [range, setRange] = useState<ChartRange>("Y");
  const accent = metricAccent(meta.type);
  const visible = filterByRange(
    metrics.map((metric) => ({ t: Date.parse(metric.measured_at), metric })),
    range,
  );
  const latest = visible.at(-1)?.metric ?? metrics.at(-1);
  const unit = latest?.unit ?? meta.fallbackUnit;
  const points = visible
    .map(({ t, metric }) => ({ t, value: metric.value }))
    .sort((a, b) => a.t - b.t);
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-separator bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-white"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          >
            <MetricGlyph metric={meta.type} className="h-4 w-4" />
          </span>
          <h3 className="text-[15px] font-semibold text-label">{meta.label}</h3>
        </div>
        <RangeSegmentedControl
          value={range}
          onChange={setRange}
          label={`${meta.label} chart time range`}
        />
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-[24px] font-semibold leading-none tabular-nums text-label">
          {latest === undefined ? "—" : formatMetricValue(latest.value)}
        </span>
        {unit === "" ? null : (
          <span className="text-[13px] text-label-secondary">{unit}</span>
        )}
      </p>
      {points.length < 2 ? (
        <InsufficientData
          message={
            metrics.length === 0
              ? "No readings yet"
              : metrics.length === 1
                ? "Only one reading so far"
                : "No readings in this range"
          }
          hint={
            metrics.length >= 2
              ? "Try a wider range."
              : "Apple Health pushes these once the bridge app is wired up."
          }
        />
      ) : (
        <TimeSeriesChart
          points={points}
          unit={unit}
          valueFormat={formatMetricValue}
          accent={accent}
          compact
          chartLabel={`${meta.label} over time${unit === "" ? "" : ` in ${unit}`}`}
        />
      )}
    </div>
  );
}
