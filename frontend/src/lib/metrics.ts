/** Apple Health signals shown on the dashboard (design D7). */

import { fetchMetrics, type MetricRead } from "@/lib/api";

/** The five prioritized signals that also appear as Favorites tiles. */
export const PRIORITIZED_METRIC_TYPES = [
  "resting_heart_rate",
  "sleep",
  "active_energy",
  "vo2_max",
  "steps",
] as const;

export type PrioritizedMetricType = (typeof PRIORITIZED_METRIC_TYPES)[number];

/** Every metric type the backend serves (canonical values from health_export_kit.py). */
export const METRIC_TYPES = [
  // Activity
  "steps",
  "active_energy",
  "basal_energy",
  "distance_km",
  "flights_climbed",
  // Heart
  "resting_heart_rate",
  "heart_rate_avg",
  "walking_heart_rate",
  "vo2_max",
  "spo2",
  "breathing_disturbances",
  // Sleep
  "sleep",
  "sleep_duration",
  "sleep_deep",
  "sleep_rem",
  "sleep_core",
  "sleep_efficiency",
  "sleep_awakenings",
  "sleep_hr_avg",
  "sleep_hrv",
  "sleep_spo2",
  "sleep_respiratory_rate",
  // Body
  "bmi",
  "height",
  "lean_mass",
  // Nutrition
  "caffeine",
  "carbs",
  "cholesterol",
  "diet_energy",
  "fat",
  "fiber",
  "protein",
  "sat_fat",
  "sodium",
  "sugar",
  "water",
  // Workouts
  "workout_duration",
  "workout_distance",
  "workout_active_energy",
  "workout_total_energy",
  "workout_avg_hr",
  "workout_max_hr",
  // Mobility
  "walking_speed",
  "walking_asymmetry",
  "step_length",
  "double_support_time",
  "stair_speed_up",
  // Mind
  "daylight_minutes",
] as const;

export type MetricType = (typeof METRIC_TYPES)[number];

export type MetricSection =
  | "Activity"
  | "Heart"
  | "Sleep"
  | "Body"
  | "Nutrition"
  | "Workouts"
  | "Mobility"
  | "Mind";

export interface MetricThresholds {
  readonly min?: number;
  readonly max?: number;
  /** Authoritative body behind the range (e.g. "World Health Organization"). */
  readonly source?: string;
  /** One-line plain-English explanation of the recommendation. */
  readonly note?: string;
}

export interface MetricSignalMeta {
  readonly type: MetricType;
  readonly label: string;
  readonly fallbackUnit: string;
  readonly section: MetricSection;
  readonly thresholds?: MetricThresholds;
}

export const METRIC_SIGNALS: readonly MetricSignalMeta[] = [
  // --- Activity ---
  {
    type: "steps",
    label: "Steps",
    fallbackUnit: "",
    section: "Activity",
    thresholds: {
      min: 7500,
      source: "Research (JAMA Intern Med 2019)",
      note: "No official step guideline; 7500 is where mortality benefit plateaus",
    },
  },
  {
    type: "active_energy",
    label: "Active energy",
    fallbackUnit: "kcal",
    section: "Activity",
  },
  {
    type: "basal_energy",
    label: "Basal Energy",
    fallbackUnit: "kcal",
    section: "Activity",
  },
  {
    type: "distance_km",
    label: "Distance",
    fallbackUnit: "km",
    section: "Activity",
  },
  {
    type: "flights_climbed",
    label: "Flights Climbed",
    fallbackUnit: "flights",
    section: "Activity",
  },
  // --- Heart ---
  {
    type: "resting_heart_rate",
    label: "Resting heart rate",
    fallbackUnit: "bpm",
    section: "Heart",
    thresholds: {
      min: 60,
      max: 100,
      source: "American Heart Association (AHA)",
      note: "Normal resting heart rate for adults",
    },
  },
  {
    type: "heart_rate_avg",
    label: "Avg Heart Rate",
    fallbackUnit: "bpm",
    section: "Heart",
  },
  {
    type: "walking_heart_rate",
    label: "Walking Heart Rate",
    fallbackUnit: "bpm",
    section: "Heart",
  },
  {
    type: "vo2_max",
    label: "VO₂ max",
    fallbackUnit: "ml/kg·min",
    section: "Heart",
    thresholds: {
      min: 35,
      max: 65,
      source: "American College of Sports Medicine (ACSM)",
      note: "Age/sex-dependent norms; 35–65 spans 'good' young men to 'average' older adults",
    },
  },
  {
    type: "spo2",
    label: "SpO₂",
    fallbackUnit: "%",
    section: "Heart",
    thresholds: {
      min: 95,
      source: "World Health Organization (WHO)",
      note: "Normal 95–100% at sea level; below 90% is clinically low",
    },
  },
  {
    type: "breathing_disturbances",
    label: "Breathing Disturbances",
    fallbackUnit: "count",
    section: "Heart",
  },
  // --- Sleep ---
  {
    type: "sleep",
    label: "Sleep",
    fallbackUnit: "h",
    section: "Sleep",
    thresholds: {
      min: 7,
      max: 9,
      source: "National Sleep Foundation (NSF)",
      note: "7–9 h for adults 18–64",
    },
  },
  {
    type: "sleep_duration",
    label: "Sleep Duration",
    fallbackUnit: "h",
    section: "Sleep",
    thresholds: {
      min: 7,
      max: 9,
      source: "National Sleep Foundation (NSF)",
      note: "7–9 h for adults 18–64",
    },
  },
  {
    type: "sleep_deep",
    label: "Deep Sleep",
    fallbackUnit: "h",
    section: "Sleep",
  },
  {
    type: "sleep_rem",
    label: "REM Sleep",
    fallbackUnit: "h",
    section: "Sleep",
  },
  {
    type: "sleep_core",
    label: "Core Sleep",
    fallbackUnit: "h",
    section: "Sleep",
  },
  {
    type: "sleep_efficiency",
    label: "Sleep Efficiency",
    fallbackUnit: "%",
    section: "Sleep",
    thresholds: {
      min: 85,
      source: "National Sleep Foundation (NSF)",
      note: "Consensus panel: ≥85% indicates good sleep quality",
    },
  },
  {
    type: "sleep_awakenings",
    label: "Awakenings",
    fallbackUnit: "count",
    section: "Sleep",
  },
  {
    type: "sleep_hr_avg",
    label: "Sleep Heart Rate",
    fallbackUnit: "bpm",
    section: "Sleep",
    thresholds: {
      min: 50,
      max: 80,
      source: "Clinical convention (AHA basis)",
      note: "No formal guideline; sleep HR ~20–30% below resting 60–100",
    },
  },
  {
    type: "sleep_hrv",
    label: "Sleep HRV",
    fallbackUnit: "ms",
    section: "Sleep",
  },
  {
    type: "sleep_spo2",
    label: "Sleep SpO₂",
    fallbackUnit: "%",
    section: "Sleep",
    thresholds: {
      min: 95,
      source: "World Health Organization (WHO)",
      note: "Normal 95–100%; brief dips during sleep are common",
    },
  },
  {
    type: "sleep_respiratory_rate",
    label: "Respiratory Rate",
    fallbackUnit: "brpm",
    section: "Sleep",
    thresholds: {
      min: 12,
      max: 20,
      source: "World Health Organization (WHO)",
      note: "Normal adult resting rate 12–20 breaths/min",
    },
  },
  // --- Body ---
  {
    type: "bmi",
    label: "BMI",
    fallbackUnit: "BMI",
    section: "Body",
    thresholds: {
      min: 18.5,
      max: 24.9,
      source: "World Health Organization (WHO)",
      note: "18.5–24.9 = normal weight; 25+ overweight, <18.5 underweight",
    },
  },
  {
    type: "height",
    label: "Height",
    fallbackUnit: "cm",
    section: "Body",
  },
  {
    type: "lean_mass",
    label: "Lean Mass",
    fallbackUnit: "kg",
    section: "Body",
  },
  // --- Nutrition ---
  {
    type: "caffeine",
    label: "Caffeine",
    fallbackUnit: "mg",
    section: "Nutrition",
    thresholds: {
      max: 400,
      source: "FDA / EFSA",
      note: "400 mg/day safe for healthy adults (~4 cups of coffee)",
    },
  },
  {
    type: "carbs",
    label: "Carbs",
    fallbackUnit: "g",
    section: "Nutrition",
  },
  {
    type: "cholesterol",
    label: "Cholesterol",
    fallbackUnit: "mg",
    section: "Nutrition",
    thresholds: {
      max: 300,
      source: "Dietary Guidelines for Americans (DGA)",
      note: "300 mg limit was removed in 2015; eat as little as possible",
    },
  },
  {
    type: "diet_energy",
    label: "Diet Energy",
    fallbackUnit: "kcal",
    section: "Nutrition",
    thresholds: {
      min: 1500,
      max: 2500,
      source: "Dietary Guidelines for Americans (DGA)",
      note: "Age/sex/activity dependent; 1500–2500 is a rough adult band",
    },
  },
  {
    type: "fat",
    label: "Fat",
    fallbackUnit: "g",
    section: "Nutrition",
    thresholds: {
      min: 44,
      max: 78,
      source: "DGA / IOM (AMDR)",
      note: "20–35% of calories = 44–78 g on a 2000 kcal diet",
    },
  },
  {
    type: "fiber",
    label: "Fiber",
    fallbackUnit: "g",
    section: "Nutrition",
    thresholds: {
      min: 25,
      source: "American Heart Association (AHA)",
      note: "≥25 g/day; DGA equivalent is 14 g per 1000 kcal",
    },
  },
  {
    type: "protein",
    label: "Protein",
    fallbackUnit: "g",
    section: "Nutrition",
  },
  {
    type: "sat_fat",
    label: "Saturated Fat",
    fallbackUnit: "g",
    section: "Nutrition",
    thresholds: {
      max: 22,
      source: "DGA / AHA",
      note: "<10% of calories = ≤22 g on a 2000 kcal diet",
    },
  },
  {
    type: "sodium",
    label: "Sodium",
    fallbackUnit: "mg",
    section: "Nutrition",
    thresholds: {
      max: 2300,
      source: "DGA / FDA",
      note: "≤2300 mg/day; WHO is stricter at <2000 mg",
    },
  },
  {
    type: "sugar",
    label: "Sugar",
    fallbackUnit: "g",
    section: "Nutrition",
    thresholds: {
      max: 36,
      source: "American Heart Association (AHA)",
      note: "36 g = men's limit (9 tsp); women's is 25 g",
    },
  },
  {
    type: "water",
    label: "Water",
    fallbackUnit: "mL",
    section: "Nutrition",
    thresholds: {
      min: 2000,
      max: 3000,
      source: "EFSA",
      note: "2.0 L/day women, 2.5 L/day men — total water incl. food",
    },
  },
  // --- Workouts ---
  {
    type: "workout_duration",
    label: "Workout Duration",
    fallbackUnit: "min",
    section: "Workouts",
  },
  {
    type: "workout_distance",
    label: "Workout Distance",
    fallbackUnit: "km",
    section: "Workouts",
  },
  {
    type: "workout_active_energy",
    label: "Workout Active Energy",
    fallbackUnit: "kcal",
    section: "Workouts",
  },
  {
    type: "workout_total_energy",
    label: "Workout Total Energy",
    fallbackUnit: "kcal",
    section: "Workouts",
  },
  {
    type: "workout_avg_hr",
    label: "Workout Avg HR",
    fallbackUnit: "bpm",
    section: "Workouts",
  },
  {
    type: "workout_max_hr",
    label: "Workout Max HR",
    fallbackUnit: "bpm",
    section: "Workouts",
  },
  // --- Mobility ---
  {
    type: "walking_speed",
    label: "Walking Speed",
    fallbackUnit: "km/h",
    section: "Mobility",
  },
  {
    type: "walking_asymmetry",
    label: "Walking Asymmetry",
    fallbackUnit: "%",
    section: "Mobility",
  },
  {
    type: "step_length",
    label: "Step Length",
    fallbackUnit: "cm",
    section: "Mobility",
  },
  {
    type: "double_support_time",
    label: "Double Support Time",
    fallbackUnit: "%",
    section: "Mobility",
  },
  {
    type: "stair_speed_up",
    label: "Stair Speed Up",
    fallbackUnit: "m/s",
    section: "Mobility",
  },
  // --- Mind ---
  {
    type: "daylight_minutes",
    label: "Daylight Minutes",
    fallbackUnit: "min",
    section: "Mind",
  },
];

export type MetricsBundle = Readonly<Record<MetricType, readonly MetricRead[]>>;

export async function loadMetricsBundle(
  signal?: AbortSignal,
): Promise<MetricsBundle> {
  const entries = await Promise.all(
    METRIC_TYPES.map((type) => fetchMetrics(type, signal)),
  );
  const bundle = {} as Record<MetricType, readonly MetricRead[]>;
  METRIC_TYPES.forEach((type, index) => {
    bundle[type] = entries[index] ?? [];
  });
  return bundle;
}

export function formatMetricValue(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
