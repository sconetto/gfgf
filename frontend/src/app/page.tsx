"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchHealth,
  fetchHabitLogs,
  fetchPersonalBests,
  fetchProfile,
  fetchSessionBests,
  fetchWeights,
  type HabitLogRead,
  type MetricRead,
  type PersonalBest,
  type ProfileRead,
  type WeightRead,
} from "@/lib/api";
import { minusDaysISO, todayLocalISO } from "@/lib/dates";
import {
  loadMetricsBundle,
  type MetricsBundle,
  type PrioritizedMetricType,
} from "@/lib/metrics";
import type { LoadState } from "@/components/LoadGate";
import { NAV_ITEMS, findNavItem, type CategoryId } from "@/components/nav";
import type { ChartRange } from "@/components/RangeSegmentedControl";
import { MobileTabBar, Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import type { HealthState } from "@/components/HealthBadge";
import type { DashboardPanelProps } from "@/components/panels/types";

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

const NAV_STORAGE_KEY = "gfgf-nav";

function isCategoryId(value: string): value is CategoryId {
  return NAV_ITEMS.some((item) => item.id === value);
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

  // Active category is client-side state (design D1), defaulting to Insights
  // and restored from localStorage after mount (design D7 — mirrors the
  // gfgf-theme pattern; post-mount so server and client HTML match).
  const [activeCategory, setActiveCategory] = useState<CategoryId>("insights");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NAV_STORAGE_KEY);
      if (stored !== null && isCategoryId(stored)) {
        setActiveCategory(stored);
      }
    } catch {
      // Storage can be unavailable (private mode) — keep the default.
    }
  }, []);
  const handleSelectCategory = useCallback((id: CategoryId) => {
    setActiveCategory(id);
    try {
      localStorage.setItem(NAV_STORAGE_KEY, id);
    } catch {
      // Storage can be unavailable — the switch still works.
    }
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

  // All data loading stays here, unconditionally, so switching categories is
  // instant — no refetch, no hook remounts (design D1).
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

  const activeItem = findNavItem(activeCategory);
  const ActivePanel = activeItem.panel;

  // Everything the active panel needs, passed as typed props (design D2/D3).
  const panelProps: DashboardPanelProps = {
    refresh,
    reloadKey,
    globalRange,
    rangeOverrides,
    onChartRange: handleChartRange,
    weightsState,
    sessionBestsState,
    personalBestsState,
    habitLogsState,
    metricsState,
    profileState,
    rememberedTracks,
    tracks,
    habitLogs,
    profile,
    weightLatest,
    stepsLatest,
    restingLatest,
    sleepLatest,
    energyLatest,
    vo2Latest,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        active={activeCategory}
        onSelect={handleSelectCategory}
        healthState={healthState}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 border-b border-separator bg-health-bg">
          <TopBar
            healthState={healthState}
            globalRange={globalRange}
            onGlobalRange={handleGlobalRange}
          />
          <MobileTabBar active={activeCategory} onSelect={handleSelectCategory} />
        </div>
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <header className="flex flex-col gap-1">
            <h1 className="text-[34px] font-bold leading-tight tracking-tight text-label">
              {activeItem.label}
            </h1>
            <p className="text-[15px] text-label-secondary">{todayLabel}</p>
          </header>
          <ActivePanel {...panelProps} />
          <footer className="pb-2 text-center text-xs text-label-tertiary">
            self-hosted · LAN only · no auth by design
          </footer>
        </main>
      </div>
    </div>
  );
}
