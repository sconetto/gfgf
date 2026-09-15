import type { ReactElement } from "react";

import type { PersonalBest, SessionBest, WeightRead } from "@/lib/api";
import { METRIC_SIGNALS, formatMetricValue, type PrioritizedMetricType } from "@/lib/metrics";
import { CorrelationPanel } from "@/components/CorrelationPanel";
import { FavoriteTile } from "@/components/FavoriteTile";
import { LoadGate } from "@/components/LoadGate";
import { PersonalBestBoard } from "@/components/PersonalBestBoard";
import { WeightTrendChart } from "@/components/WeightTrendChart";
import type { DashboardPanelProps } from "@/components/panels/types";

function fallbackUnit(type: PrioritizedMetricType): string {
  return METRIC_SIGNALS.find((meta) => meta.type === type)?.fallbackUnit ?? "";
}

/** Insights: favorites tiles, highlights (weight trend + personal bests), correlation. */
export function InsightsPanel({
  weightLatest,
  stepsLatest,
  restingLatest,
  sleepLatest,
  energyLatest,
  vo2Latest,
  weightsState,
  sessionBestsState,
  personalBestsState,
  globalRange,
  rangeOverrides,
  onChartRange,
}: DashboardPanelProps): ReactElement {
  return (
    <>
      <section aria-label="Favorites" className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-label">Favorites</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <FavoriteTile
            label="Weight"
            metric="weight"
            value={weightLatest === undefined ? null : weightLatest.weight_kg.toFixed(1)}
            unit="kg"
          />
          <FavoriteTile
            label="Steps"
            metric="steps"
            value={stepsLatest === undefined ? null : formatMetricValue(stepsLatest.value)}
            unit={stepsLatest?.unit ?? fallbackUnit("steps")}
          />
          <FavoriteTile
            label="Resting Heart Rate"
            metric="resting_heart_rate"
            value={
              restingLatest === undefined ? null : formatMetricValue(restingLatest.value)
            }
            unit={restingLatest?.unit ?? fallbackUnit("resting_heart_rate")}
          />
          <FavoriteTile
            label="Sleep"
            metric="sleep"
            value={sleepLatest === undefined ? null : formatMetricValue(sleepLatest.value)}
            unit={sleepLatest?.unit ?? fallbackUnit("sleep")}
          />
          <FavoriteTile
            label="Active Energy"
            metric="active_energy"
            value={
              energyLatest === undefined ? null : formatMetricValue(energyLatest.value)
            }
            unit={energyLatest?.unit ?? fallbackUnit("active_energy")}
          />
          {vo2Latest === undefined ? null : (
            <FavoriteTile
              label="VO₂ Max"
              metric="vo2_max"
              value={formatMetricValue(vo2Latest.value)}
              unit={vo2Latest.unit ?? fallbackUnit("vo2_max")}
            />
          )}
        </div>
      </section>

      <section aria-label="Trends" className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-label">Highlights</h2>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <LoadGate state={weightsState}>
              {(weights: readonly WeightRead[]) => (
                <WeightTrendChart
                  weights={weights}
                  range={rangeOverrides["weight"] ?? globalRange}
                  onRangeChange={(range) => onChartRange("weight", range)}
                />
              )}
            </LoadGate>
          </div>
          <div className="lg:col-span-2">
            <LoadGate state={personalBestsState}>
              {(personalBests: readonly PersonalBest[]) => (
                <PersonalBestBoard personalBests={personalBests} />
              )}
            </LoadGate>
          </div>
        </div>
      </section>

      <LoadGate state={weightsState}>
        {(weights: readonly WeightRead[]) => (
          <LoadGate state={sessionBestsState}>
            {(sessionBests: readonly SessionBest[]) => (
              <CorrelationPanel sessionBests={sessionBests} weights={weights} />
            )}
          </LoadGate>
        )}
      </LoadGate>
    </>
  );
}
