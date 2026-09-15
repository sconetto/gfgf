import type { ActivityLevel, ProfileRead, Sex } from "@/lib/api";
import type { MetricThresholds, MetricType } from "@/lib/metrics";

export const ACTIVITY_MULTIPLIERS: Readonly<Record<ActivityLevel, number>> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

export function bmr(profile: ProfileRead, weightKg: number): number {
  const base = 10 * weightKg + 6.25 * profile.height_cm - 5 * profile.age_years;
  return profile.sex === "male" ? base + 5 : base - 161;
}

export function tdee(profile: ProfileRead, weightKg: number): number {
  return bmr(profile, weightKg) * ACTIVITY_MULTIPLIERS[profile.activity_level];
}

export function maxHeartRate(ageYears: number): number {
  return 220 - ageYears;
}

export interface HrZone {
  readonly name: string;
  readonly pct: string;
  readonly minBpm: number;
  readonly maxBpm: number;
}

export function hrZones(maxHr: number): readonly HrZone[] {
  const bounds = [
    ["Z1 · very light", 0.5, 0.6],
    ["Z2 · light", 0.6, 0.7],
    ["Z3 · moderate", 0.7, 0.8],
    ["Z4 · hard", 0.8, 0.9],
    ["Z5 · max", 0.9, 1.0],
  ] as const;
  return bounds.map(([name, lo, hi]) => ({
    name,
    pct: `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`,
    minBpm: Math.round(maxHr * lo),
    maxBpm: Math.round(maxHr * hi),
  }));
}

export interface MacroTargets {
  readonly proteinG: number;
  readonly fatG: number;
  readonly carbsG: number;
}

export function macroTargets(
  weightKg: number,
  dailyTdee: number,
): MacroTargets {
  const proteinG = 1.6 * weightKg;
  const fatG = (0.25 * dailyTdee) / 9;
  const carbsG = (dailyTdee - proteinG * 4 - fatG * 9) / 4;
  return {
    proteinG: Math.round(proteinG),
    fatG: Math.round(fatG),
    carbsG: Math.max(Math.round(carbsG), 0),
  };
}

export function waterTargetMl(weightKg: number): number {
  return Math.round(35 * weightKg);
}

/** "Good" VO₂ max (ml/kg·min) reference by sex and age bracket. */
function vo2MaxReference(sex: Sex, ageYears: number): number {
  const bracket =
    ageYears < 30 ? 0 : ageYears < 40 ? 1 : ageYears < 50 ? 2 : ageYears < 60 ? 3 : 4;
  const male = [45, 42, 38, 34, 30];
  const female = [36, 33, 30, 27, 23];
  return sex === "male" ? male[bracket] ?? 30 : female[bracket] ?? 23;
}

function round(value: number): number {
  return Math.round(value);
}

/**
 * Profile-driven threshold override for one metric. Returns undefined when the
 * metric has no personalization or the required inputs (weight) are missing,
 * so the caller falls back to the static threshold.
 */
export function personalizeThresholds(
  profile: ProfileRead,
  weightKg: number | null,
  type: MetricType,
): MetricThresholds | undefined {
  switch (type) {
    case "diet_energy": {
      if (weightKg === null) {
        return undefined;
      }
      const daily = tdee(profile, weightKg);
      return {
        min: round(daily - 500),
        max: round(daily),
        source: "Dietary Guidelines for Americans (DGA)",
        note: `Personalized to your estimated TDEE (~${round(daily)} kcal/day)`,
      };
    }
    case "water": {
      if (weightKg === null) {
        return undefined;
      }
      return {
        min: round(30 * weightKg),
        max: round(40 * weightKg),
        source: "EFSA",
        note: `Weight-scaled (~35 mL/kg); ${waterTargetMl(weightKg)} mL for you`,
      };
    }
    case "fat": {
      if (weightKg === null) {
        return undefined;
      }
      const daily = tdee(profile, weightKg);
      return {
        min: round((0.2 * daily) / 9),
        max: round((0.35 * daily) / 9),
        source: "DGA / IOM (AMDR)",
        note: "20–35% of calories as fat",
      };
    }
    case "sat_fat": {
      if (weightKg === null) {
        return undefined;
      }
      const daily = tdee(profile, weightKg);
      return {
        max: round((0.1 * daily) / 9),
        source: "DGA / AHA",
        note: "<10% of calories from saturated fat",
      };
    }
    case "vo2_max":
      return {
        min: vo2MaxReference(profile.sex, profile.age_years),
        source: "American College of Sports Medicine (ACSM)",
        note: "Age/sex-dependent 'good' reference",
      };
    case "sleep":
    case "sleep_duration":
      return profile.age_years >= 65
        ? {
            min: 7,
            max: 8,
            source: "National Sleep Foundation (NSF)",
            note: "7–8 h recommended for adults 65+",
          }
        : {
            min: 7,
            max: 9,
            source: "National Sleep Foundation (NSF)",
            note: "7–9 h recommended for adults 18–64",
          };
    default:
      return undefined;
  }
}
