import type { ReactElement } from "react";

import {
  ActivityGlyph,
  CircleGlyph,
  FlameGlyph,
  HeartGlyph,
  MoonGlyph,
  ScaleGlyph,
  StopwatchGlyph,
  SunGlyph,
  WalkGlyph,
  WindGlyph,
} from "@/components/icons";

/**
 * Apple-Health-style accent mapping: every metric gets one saturated iOS
 * system color (resolved through the `@theme` tokens in globals.css) and a
 * matching glyph for its rounded-square badge.
 */

export type MetricKey =
  | "weight"
  | "steps"
  | "distance"
  | "flights"
  | "basal_energy"
  | "active_energy"
  | "resting_heart_rate"
  | "heart_rate_avg"
  | "walking_heart_rate"
  | "spo2"
  | "sleep"
  | "sleep_duration"
  | "sleep_deep"
  | "sleep_rem"
  | "sleep_core"
  | "sleep_efficiency"
  | "vo2_max"
  | "daylight"
  | "mindfulness"
  | "lap"
  | "distance_km"
  | "flights_climbed"
  | "breathing_disturbances"
  | "sleep_awakenings"
  | "sleep_hr_avg"
  | "sleep_hrv"
  | "sleep_spo2"
  | "sleep_respiratory_rate"
  | "bmi"
  | "height"
  | "lean_mass"
  | "caffeine"
  | "carbs"
  | "cholesterol"
  | "diet_energy"
  | "fat"
  | "fiber"
  | "protein"
  | "sat_fat"
  | "sodium"
  | "sugar"
  | "water"
  | "workout_duration"
  | "workout_distance"
  | "workout_active_energy"
  | "workout_total_energy"
  | "workout_avg_hr"
  | "workout_max_hr"
  | "walking_speed"
  | "walking_asymmetry"
  | "step_length"
  | "double_support_time"
  | "stair_speed_up"
  | "daylight_minutes";

export function metricAccent(metric: MetricKey): string {
  switch (metric) {
    case "weight":
    case "spo2":
    case "bmi":
    case "height":
    case "lean_mass":
    case "sodium":
      return "var(--color-ios-blue)";
    case "steps":
    case "distance":
    case "flights":
    case "distance_km":
    case "flights_climbed":
    case "basal_energy":
    case "caffeine":
    case "fat":
    case "sat_fat":
      return "var(--color-ios-orange)";
    case "active_energy":
    case "diet_energy":
    case "sugar":
    case "workout_active_energy":
    case "workout_total_energy":
      return "var(--color-ios-pink)";
    case "resting_heart_rate":
    case "heart_rate_avg":
    case "walking_heart_rate":
    case "breathing_disturbances":
    case "cholesterol":
    case "workout_avg_hr":
    case "workout_max_hr":
      return "var(--color-ios-red)";
    case "sleep":
    case "sleep_duration":
    case "sleep_deep":
    case "sleep_rem":
    case "sleep_core":
    case "sleep_efficiency":
    case "sleep_awakenings":
    case "sleep_hr_avg":
    case "sleep_hrv":
    case "sleep_spo2":
    case "sleep_respiratory_rate":
      return "var(--color-ios-indigo)";
    case "vo2_max":
    case "water":
      return "var(--color-ios-cyan)";
    case "daylight":
    case "mindfulness":
    case "daylight_minutes":
    case "walking_speed":
    case "walking_asymmetry":
    case "step_length":
    case "double_support_time":
    case "stair_speed_up":
      return "var(--color-ios-teal)";
    case "carbs":
    case "fiber":
    case "protein":
    case "workout_duration":
    case "workout_distance":
    case "lap":
      return "var(--color-ios-green)";
  }
}

interface MetricGlyphProps {
  readonly metric: MetricKey;
  readonly className?: string;
}

export function MetricGlyph({ metric, className = "h-4 w-4" }: MetricGlyphProps): ReactElement {
  switch (metric) {
    case "weight":
    case "bmi":
    case "lean_mass":
    case "walking_asymmetry":
      return <ScaleGlyph className={className} />;
    case "steps":
    case "distance":
    case "flights":
    case "distance_km":
    case "flights_climbed":
    case "walking_speed":
    case "step_length":
      return <WalkGlyph className={className} />;
    case "basal_energy":
    case "active_energy":
    case "diet_energy":
    case "fat":
    case "sat_fat":
    case "workout_active_energy":
    case "workout_total_energy":
      return <FlameGlyph className={className} />;
    case "resting_heart_rate":
    case "heart_rate_avg":
    case "walking_heart_rate":
    case "sleep_hr_avg":
    case "sleep_hrv":
    case "workout_avg_hr":
    case "workout_max_hr":
      return <HeartGlyph className={className} />;
    case "spo2":
    case "vo2_max":
      return <WindGlyph className={className} />;
    case "sleep":
    case "sleep_duration":
    case "sleep_deep":
    case "sleep_rem":
    case "sleep_core":
    case "sleep_efficiency":
    case "sleep_awakenings":
      return <MoonGlyph className={className} />;
    case "daylight":
    case "mindfulness":
    case "daylight_minutes":
    case "breathing_disturbances":
    case "double_support_time":
    case "stair_speed_up":
    case "height":
    case "workout_distance":
    case "sleep_respiratory_rate":
      return <ActivityGlyph className={className} />;
    case "caffeine":
      return <SunGlyph className={className} />;
    case "carbs":
    case "cholesterol":
    case "fiber":
    case "protein":
    case "sodium":
    case "sugar":
    case "water":
    case "sleep_spo2":
      return <CircleGlyph className={className} />;
    case "workout_duration":
    case "lap":
      return <StopwatchGlyph className={className} />;
  }
}
