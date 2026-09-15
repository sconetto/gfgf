import type { LoadState } from "@/components/LoadGate";
import type { ChartRange } from "@/components/RangeSegmentedControl";
import type {
  HabitLogRead,
  MetricRead,
  PersonalBest,
  ProfileRead,
  SessionBest,
  WeightRead,
} from "@/lib/api";
import type { MetricsBundle } from "@/lib/metrics";

/**
 * Everything a category panel may need, passed down from `HomePage`.
 *
 * All data loading and state stays in `HomePage` (design D1) so switching
 * categories is instant — panels are presentational and destructure only the
 * slice they use. The uniform shape is what lets `NAV_ITEMS` treat the six
 * panels interchangeably (design D2).
 */
export interface DashboardPanelProps {
  /** Bump to refetch all page data (after a form save or delete). */
  readonly refresh: () => void;
  /** Current page-wide reload counter (drives LapHistory's own refetch). */
  readonly reloadKey: number;

  // Chart time-range state (global default + per-chart overrides).
  readonly globalRange: ChartRange;
  readonly rangeOverrides: Readonly<Record<string, ChartRange>>;
  readonly onChartRange: (id: string, range: ChartRange) => void;

  // Raw load states, for LoadGate-wrapped views.
  readonly weightsState: LoadState<readonly WeightRead[]>;
  readonly sessionBestsState: LoadState<readonly SessionBest[]>;
  readonly personalBestsState: LoadState<readonly PersonalBest[]>;
  readonly habitLogsState: LoadState<readonly HabitLogRead[]>;
  readonly metricsState: LoadState<MetricsBundle>;
  readonly profileState: LoadState<ProfileRead | null>;

  // Coalesced values (last known while a refresh is in flight).
  readonly rememberedTracks: readonly string[];
  readonly tracks: readonly string[];
  readonly habitLogs: readonly HabitLogRead[];
  readonly profile: ProfileRead | null;

  // Latest readings for the favorites tiles and derived views.
  readonly weightLatest: WeightRead | undefined;
  readonly stepsLatest: MetricRead | undefined;
  readonly restingLatest: MetricRead | undefined;
  readonly sleepLatest: MetricRead | undefined;
  readonly energyLatest: MetricRead | undefined;
  readonly vo2Latest: MetricRead | undefined;
}
