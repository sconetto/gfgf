"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import {
  fetchHealth,
  fetchHabitLogs,
  fetchPersonalBests,
  fetchProfile,
  fetchSessionBests,
  fetchWeights,
  type HabitLogRead,
  type HealthStatus,
  type MetricRead,
  type PersonalBest,
  type ProfileRead,
  type SessionBest,
  type WeightRead,
} from "@/lib/api";
import { minusDaysISO, todayLocalISO } from "@/lib/dates";
import {
  METRIC_SIGNALS,
  formatMetricValue,
  loadMetricsBundle,
  type MetricsBundle,
  type PrioritizedMetricType,
} from "@/lib/metrics";
import { CorrelationPanel } from "@/components/CorrelationPanel";
import { DerivedCards } from "@/components/DerivedCards";
import { FavoriteTile } from "@/components/FavoriteTile";
import { HabitCheckIn } from "@/components/HabitCheckIn";
import { HabitHistory } from "@/components/HabitHistory";
import { HealthSignals } from "@/components/HealthSignals";
import { LapForm } from "@/components/LapForm";
import { LapHistory } from "@/components/LapHistory";
import { PersonalBestBoard } from "@/components/PersonalBestBoard";
import { ProfileForm } from "@/components/ProfileForm";
import { RangeSegmentedControl, type ChartRange } from "@/components/RangeSegmentedControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeighInForm } from "@/components/WeighInForm";
import { WeightHistory } from "@/components/WeightHistory";
import { WeightTrendChart } from "@/components/WeightTrendChart";

type HealthState =
  | { readonly kind: "loading" }
  | { readonly kind: "healthy"; readonly health: HealthStatus }
  | { readonly kind: "unreachable"; readonly message: string };

type LoadState<T> =
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly data: T }
  | { readonly kind: "error"; readonly message: string };

function useLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  reloadKey: number,
): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ kind: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    setState({ kind: "loading" });
    load(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ kind: "loaded", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        setState({ kind: "error", message });
      });
    return () => controller.abort();
  }, [load, reloadKey]);
  return state;
}

function LoadGate<T>({
  state,
  children,
}: {
  readonly state: LoadState<T>;
  readonly children: (data: T) => ReactNode;
}): ReactNode {
  switch (state.kind) {
    case "loading":
      return (
        <p className="px-1 py-8 text-center text-sm text-label-tertiary">loading…</p>
      );
    case "error":
      return <p className="px-1 py-8 text-center text-sm text-ios-red">{state.message}</p>;
    case "loaded":
      return children(state.data);
  }
}

const HABIT_WINDOW_DAYS = 30;

function loadRecentHabitLogs(
  signal: AbortSignal,
): Promise<readonly HabitLogRead[]> {
  const today = todayLocalISO();
  return fetchHabitLogs(minusDaysISO(today, HABIT_WINDOW_DAYS - 1), today, signal);
}

function metricLatest(
  bundle: MetricsBundle | null,
  type: PrioritizedMetricType,
): MetricRead | undefined {
  return bundle?.[type].at(-1);
}

function fallbackUnit(type: PrioritizedMetricType): string {
  return METRIC_SIGNALS.find((meta) => meta.type === type)?.fallbackUnit ?? "";
}

export default function HomePage() {
  const [healthState, setHealthState] = useState<HealthState>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [rememberedTracks, setRememberedTracks] = useState<readonly string[]>([]);
  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  // Global range is the default; changing it clears per-chart overrides.
  const [globalRange, setGlobalRange] = useState<ChartRange>("M");
  const [rangeOverrides, setRangeOverrides] = useState<
    Readonly<Record<string, ChartRange>>
  >({});
  const handleGlobalRange = useCallback((range: ChartRange) => {
    setGlobalRange(range);
    setRangeOverrides({});
  }, []);
  const handleChartRange = useCallback((id: string, range: ChartRange) => {
    setRangeOverrides((current) => ({ ...current, [id]: range }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((health) => {
        setHealthState({ kind: "healthy", health });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Unknown error";
        setHealthState({ kind: "unreachable", message });
      });
    return () => controller.abort();
  }, []);

  const weightsState = useLoad(fetchWeights, reloadKey);
  const sessionBestsState = useLoad(fetchSessionBests, reloadKey);
  const personalBestsState = useLoad(fetchPersonalBests, reloadKey);
  const habitLogsState = useLoad(loadRecentHabitLogs, reloadKey);
  const metricsState = useLoad(loadMetricsBundle, reloadKey);
  const profileState = useLoad(fetchProfile, reloadKey);

  // Keep the last known track list while a refresh is in flight so the lap
  // history and the lap form's datalist don't flash empty between reloads.
  useEffect(() => {
    if (personalBestsState.kind !== "loaded") {
      return;
    }
    const next = personalBestsState.data.map(
      (best: PersonalBest) => best.track_name,
    );
    setRememberedTracks((current) =>
      current.length === next.length &&
      current.every((track, index) => track === next[index])
        ? current
        : next,
    );
  }, [personalBestsState]);

  const tracks: readonly string[] =
    personalBestsState.kind === "loaded"
      ? personalBestsState.data.map((best: PersonalBest) => best.track_name)
      : rememberedTracks;
  const habitLogs: readonly HabitLogRead[] =
    habitLogsState.kind === "loaded" ? habitLogsState.data : [];
  const weights: readonly WeightRead[] | null =
    weightsState.kind === "loaded" ? weightsState.data : null;
  const bundle: MetricsBundle | null =
    metricsState.kind === "loaded" ? metricsState.data : null;
  const profile: ProfileRead | null =
    profileState.kind === "loaded" ? profileState.data : null;

  const weightLatest = weights?.at(-1);
  const stepsLatest = metricLatest(bundle, "steps");
  const restingLatest = metricLatest(bundle, "resting_heart_rate");
  const sleepLatest = metricLatest(bundle, "sleep");
  const energyLatest = metricLatest(bundle, "active_energy");
  const vo2Latest = metricLatest(bundle, "vo2_max");

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-bold text-label-secondary">
            gfgf · get fit, get fast
          </p>
          <div className="flex items-center gap-2">
            <RangeSegmentedControl
              value={globalRange}
              onChange={handleGlobalRange}
              label="Global chart time range"
            />
            <HealthBadge state={healthState} />
            <ThemeToggle />
          </div>
        </div>
        <h1 className="text-[34px] font-bold leading-tight tracking-tight text-label">
          Summary
        </h1>
        <p className="text-[15px] text-label-secondary">{todayLabel}</p>
      </header>

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

      <section aria-label="Log today" className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-label">Log</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <ProfileForm profile={profile} onSaved={refresh} />
          <WeighInForm onSaved={refresh} />
          <LapForm onSaved={refresh} tracks={tracks} />
          <HabitCheckIn logs={habitLogs} onSaved={refresh} />
        </div>
      </section>

      {profile !== null && weightLatest !== undefined ? (
        <DerivedCards profile={profile} weightKg={weightLatest.weight_kg} />
      ) : null}

      {habitLogsState.kind === "loaded" ? (
        <HabitHistory logs={habitLogsState.data} />
      ) : null}

      <section aria-label="Trends" className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-label">Highlights</h2>
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <LoadGate state={weightsState}>
              {(weights: readonly WeightRead[]) => (
                <WeightTrendChart
                  weights={weights}
                  range={rangeOverrides["weight"] ?? globalRange}
                  onRangeChange={(range) => handleChartRange("weight", range)}
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

      {weightsState.kind === "loaded" ? (
        <WeightHistory weights={weightsState.data} onDeleted={refresh} />
      ) : null}

      <LoadGate state={weightsState}>
        {(weights: readonly WeightRead[]) => (
          <LoadGate state={sessionBestsState}>
            {(sessionBests: readonly SessionBest[]) => (
              <CorrelationPanel sessionBests={sessionBests} weights={weights} />
            )}
          </LoadGate>
        )}
      </LoadGate>

      {personalBestsState.kind === "loaded" || rememberedTracks.length > 0 ? (
        <LapHistory tracks={tracks} reloadKey={reloadKey} />
      ) : null}

      <HealthSignals
        state={metricsState}
        globalRange={globalRange}
        rangeOverrides={rangeOverrides}
        onChartRange={handleChartRange}
        profile={profile}
        weightKg={weightLatest?.weight_kg ?? null}
      />

      <footer className="pb-2 text-center text-xs text-label-tertiary">
        self-hosted · LAN only · no auth by design
      </footer>
    </main>
  );
}

function HealthBadge({
  state,
}: {
  readonly state: HealthState;
}): ReactElement {
  switch (state.kind) {
    case "loading":
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-separator bg-card px-3 py-1.5 text-xs font-medium text-label-tertiary">
          <span className="h-2 w-2 rounded-full bg-label-tertiary" aria-hidden="true" />
          checking backend…
        </span>
      );
    case "healthy":
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-separator bg-card px-3 py-1.5 text-xs font-medium text-label-secondary">
          <span className="h-2 w-2 rounded-full bg-ios-green" aria-hidden="true" />
          backend {state.health.status} · db {state.health.db}
        </span>
      );
    case "unreachable":
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-ios-red/30 bg-card px-3 py-1.5 text-xs font-medium text-ios-red">
          <span className="h-2 w-2 rounded-full bg-ios-red" aria-hidden="true" />
          backend unreachable ({state.message})
        </span>
      );
  }
}
