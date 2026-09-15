import type { ReactElement } from "react";

import { LapForm } from "@/components/LapForm";
import { ProfileForm } from "@/components/ProfileForm";
import { WeighInForm } from "@/components/WeighInForm";
import type { DashboardPanelProps } from "@/components/panels/types";

/** Log: the three data-entry forms (habit check-in lives in Habits). */
export function LogPanel({
  profile,
  refresh,
  tracks,
}: DashboardPanelProps): ReactElement {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ProfileForm profile={profile} onSaved={refresh} />
      <WeighInForm onSaved={refresh} />
      <LapForm onSaved={refresh} tracks={tracks} />
    </div>
  );
}
