import type { ReactElement } from "react";

import type { ProfileRead } from "@/lib/api";
import {
  hrZones,
  macroTargets,
  maxHeartRate,
  tdee,
  waterTargetMl,
  bmr,
} from "@/lib/derived";
import { Panel } from "@/components/Panel";

interface DerivedCardsProps {
  readonly profile: ProfileRead;
  readonly weightKg: number;
}

export function DerivedCards({ profile, weightKg }: DerivedCardsProps): ReactElement {
  const basal = bmr(profile, weightKg);
  const daily = tdee(profile, weightKg);
  const maxHr = maxHeartRate(profile.age_years);
  const zones = hrZones(maxHr);
  const macros = macroTargets(weightKg, daily);
  const water = waterTargetMl(weightKg);

  return (
    <Panel
      title="Derived"
      meta={<span className="text-xs text-label-tertiary">computed from your profile + latest weight</span>}
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="BMR" value={`${Math.round(basal)}`} unit="kcal/day" />
        <StatTile label="TDEE" value={`${Math.round(daily)}`} unit="kcal/day" />
        <StatTile label="Max HR" value={`${maxHr}`} unit="bpm" />
        <StatTile label="Water" value={`${Math.round(water / 100) / 10}`} unit="L/day" />
        <StatTile label="Protein" value={`${macros.proteinG}`} unit="g/day" />
        <StatTile label="Carbs" value={`${macros.carbsG}`} unit="g/day" />
      </div>
      <div className="mt-1 flex flex-col gap-2">
        <p className="text-xs font-medium text-label-secondary">Heart rate zones</p>
        <div className="flex flex-wrap gap-2">
          {zones.map((zone) => (
            <div
              key={zone.name}
              className="flex flex-col gap-0.5 rounded-[10px] bg-health-bg px-3 py-2"
            >
              <span className="text-xs font-medium text-label">{zone.name}</span>
              <span className="text-[11px] tabular-nums text-label-tertiary">
                {zone.minBpm}–{zone.maxBpm} bpm · {zone.pct}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function StatTile({
  label,
  value,
  unit,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
}): ReactElement {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[12px] border border-separator bg-card p-3">
      <span className="text-[12px] font-medium text-label-secondary">{label}</span>
      <p className="flex flex-wrap items-baseline gap-x-1">
        <span className="text-[20px] font-semibold leading-none tabular-nums text-label">
          {value}
        </span>
        <span className="text-[11px] text-label-tertiary">{unit}</span>
      </p>
    </div>
  );
}
