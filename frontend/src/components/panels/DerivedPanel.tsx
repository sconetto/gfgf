import type { ReactElement } from "react";

import { DerivedCards } from "@/components/DerivedCards";
import { InsufficientData } from "@/components/InsufficientData";
import type { DashboardPanelProps } from "@/components/panels/types";

/** Derived: metrics computed from the profile + latest weight. */
export function DerivedPanel({
  profile,
  profileState,
  weightLatest,
  weightsState,
}: DashboardPanelProps): ReactElement | null {
  // While data is still loading, stay empty — matching how the single-scroll
  // page simply omitted the cards until everything had arrived.
  if (profileState.kind === "loading" || weightsState.kind === "loading") {
    return null;
  }
  if (profile === null || weightLatest === undefined) {
    return (
      <div className="rounded-[12px] border border-separator bg-card p-5">
        <InsufficientData
          message="Nothing to derive yet"
          hint="Save your profile and log a weigh-in (Log category) to compute BMR, TDEE, heart-rate zones, and targets."
        />
      </div>
    );
  }
  return <DerivedCards profile={profile} weightKg={weightLatest.weight_kg} />;
}
