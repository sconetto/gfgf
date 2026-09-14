/** Prioritized Apple Health signals shown on the dashboard (design D7). */

import { fetchMetrics, type MetricRead } from "@/lib/api";

export const PRIORITIZED_METRIC_TYPES = [
  "resting_heart_rate",
  "sleep",
  "active_energy",
  "vo2_max",
  "steps",
] as const;

export type PrioritizedMetricType = (typeof PRIORITIZED_METRIC_TYPES)[number];

export interface MetricSignalMeta {
  readonly type: PrioritizedMetricType;
  readonly label: string;
  readonly fallbackUnit: string;
}

export const METRIC_SIGNALS: readonly MetricSignalMeta[] = [
  { type: "resting_heart_rate", label: "Resting heart rate", fallbackUnit: "bpm" },
  { type: "sleep", label: "Sleep", fallbackUnit: "h" },
  { type: "active_energy", label: "Active energy", fallbackUnit: "kcal" },
  { type: "vo2_max", label: "VO₂ max", fallbackUnit: "ml/kg·min" },
  { type: "steps", label: "Steps", fallbackUnit: "" },
];

export type MetricsBundle = Readonly<
  Record<PrioritizedMetricType, readonly MetricRead[]>
>;

export async function loadMetricsBundle(
  signal?: AbortSignal,
): Promise<MetricsBundle> {
  const [restingHeartRate, sleep, activeEnergy, vo2Max, steps] =
    await Promise.all([
      fetchMetrics("resting_heart_rate", signal),
      fetchMetrics("sleep", signal),
      fetchMetrics("active_energy", signal),
      fetchMetrics("vo2_max", signal),
      fetchMetrics("steps", signal),
    ]);
  return {
    resting_heart_rate: restingHeartRate,
    sleep,
    active_energy: activeEnergy,
    vo2_max: vo2Max,
    steps,
  };
}

export function formatMetricValue(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
