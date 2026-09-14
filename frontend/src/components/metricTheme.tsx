import type { ReactElement } from "react";

import {
  ActivityGlyph,
  FlameGlyph,
  HeartGlyph,
  MoonGlyph,
  ScaleGlyph,
  StopwatchGlyph,
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
  | "lap";

export function metricAccent(metric: MetricKey): string {
  switch (metric) {
    case "weight":
    case "spo2":
      return "var(--color-ios-blue)";
    case "steps":
    case "distance":
    case "flights":
    case "basal_energy":
      return "var(--color-ios-orange)";
    case "active_energy":
      return "var(--color-ios-pink)";
    case "resting_heart_rate":
    case "heart_rate_avg":
    case "walking_heart_rate":
      return "var(--color-ios-red)";
    case "sleep":
    case "sleep_duration":
    case "sleep_deep":
    case "sleep_rem":
    case "sleep_core":
    case "sleep_efficiency":
      return "var(--color-ios-indigo)";
    case "vo2_max":
      return "var(--color-ios-cyan)";
    case "daylight":
    case "mindfulness":
      return "var(--color-ios-teal)";
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
      return <ScaleGlyph className={className} />;
    case "steps":
      return <WalkGlyph className={className} />;
    case "distance":
    case "flights":
      return <WalkGlyph className={className} />;
    case "basal_energy":
    case "active_energy":
      return <FlameGlyph className={className} />;
    case "resting_heart_rate":
    case "heart_rate_avg":
    case "walking_heart_rate":
      return <HeartGlyph className={className} />;
    case "spo2":
      return <WindGlyph className={className} />;
    case "sleep":
    case "sleep_duration":
    case "sleep_deep":
    case "sleep_rem":
    case "sleep_core":
    case "sleep_efficiency":
      return <MoonGlyph className={className} />;
    case "vo2_max":
      return <WindGlyph className={className} />;
    case "daylight":
    case "mindfulness":
      return <ActivityGlyph className={className} />;
    case "lap":
      return <StopwatchGlyph className={className} />;
  }
}
