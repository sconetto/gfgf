"use client";

import { Fragment } from "react";
import type { ReactElement } from "react";

import type { MetricRead, ProfileRead } from "@/lib/api";
import {
  METRIC_SIGNALS,
  formatMetricValue,
  type MetricSignalMeta,
  type MetricThresholds,
  type MetricsBundle,
} from "@/lib/metrics";
import { personalizeThresholds } from "@/lib/derived";
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
  readonly globalRange: ChartRange;
  readonly rangeOverrides: Readonly<Record<string, ChartRange>>;
  readonly onChartRange: (id: string, range: ChartRange) => void;
  readonly profile: ProfileRead | null;
  readonly weightKg: number | null;
}

export function HealthSignals({
  state,
  globalRange,
  rangeOverrides,
  onChartRange,
  profile,
  weightKg,
}: HealthSignalsProps): ReactElement {
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
          {METRIC_SIGNALS.map((meta, index) => {
            const previous = METRIC_SIGNALS[index - 1];
            const showHeader =
              previous === undefined || previous.section !== meta.section;
            return (
              <Fragment key={meta.type}>
                {showHeader ? (
                  <h3 className="col-span-full mt-2 text-[13px] font-semibold uppercase tracking-wider text-label-secondary">
                    {meta.section}
                  </h3>
                ) : null}
                <SignalCard
                  meta={meta}
                  metrics={state.data[meta.type]}
                  range={rangeOverrides[meta.type] ?? globalRange}
                  onRangeChange={(range) => onChartRange(meta.type, range)}
                  thresholds={
                    profile === null
                      ? meta.thresholds
                      : (personalizeThresholds(profile, weightKg, meta.type) ??
                        meta.thresholds)
                  }
                />
              </Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SignalCard({
  meta,
  metrics,
  range,
  onRangeChange,
  thresholds,
}: {
  readonly meta: MetricSignalMeta;
  readonly metrics: readonly MetricRead[];
  readonly range: ChartRange;
  readonly onRangeChange: (range: ChartRange) => void;
  readonly thresholds: MetricThresholds | undefined;
}): ReactElement {
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
          onChange={onRangeChange}
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
          thresholds={thresholds}
          chartLabel={`${meta.label} over time${unit === "" ? "" : ` in ${unit}`}`}
        />
      )}
    </div>
  );
}
