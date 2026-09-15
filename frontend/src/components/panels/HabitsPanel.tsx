import type { ReactElement } from "react";

import { HabitCheckIn } from "@/components/HabitCheckIn";
import { HabitHistory } from "@/components/HabitHistory";
import type { DashboardPanelProps } from "@/components/panels/types";

/** Habits: the daily check-in plus its history, keeping the habit lifecycle together. */
export function HabitsPanel({
  habitLogs,
  habitLogsState,
  refresh,
}: DashboardPanelProps): ReactElement {
  return (
    <div className="flex flex-col gap-8">
      <HabitCheckIn logs={habitLogs} onSaved={refresh} />
      {habitLogsState.kind === "loaded" ? (
        <HabitHistory logs={habitLogsState.data} />
      ) : null}
    </div>
  );
}
