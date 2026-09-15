import type { ReactElement } from "react";

import { HealthSignals } from "@/components/HealthSignals";
import type { DashboardPanelProps } from "@/components/panels/types";

/** Signals: every ingested health-signal chart. */
export function SignalsPanel({
  metricsState,
  globalRange,
  rangeOverrides,
  onChartRange,
  profile,
  weightLatest,
}: DashboardPanelProps): ReactElement {
  return (
    <HealthSignals
      state={metricsState}
      globalRange={globalRange}
      rangeOverrides={rangeOverrides}
      onChartRange={onChartRange}
      profile={profile}
      weightKg={weightLatest === undefined ? null : weightLatest.weight_kg}
    />
  );
}
