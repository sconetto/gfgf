/**
 * Client-side weight ↔ lap-time correlation (design D5): one point per
 * (track, race day) from session bests, joined to the nearest weight
 * reading by date. There is no dedicated backend endpoint for this.
 */

import type { SessionBest, WeightRead } from "@/lib/api";
import { pearsonR } from "@/lib/chart";

export interface CorrelationPoint {
  readonly lapDate: string;
  readonly weightKg: number;
  readonly bestTimeMs: number;
}

export type TrackCorrelation =
  | {
      readonly kind: "ok";
      readonly trackName: string;
      readonly raceDayCount: number;
      readonly points: readonly CorrelationPoint[];
      readonly r: number | null;
    }
  | {
      readonly kind: "insufficient";
      readonly trackName: string;
      readonly raceDayCount: number;
      readonly pairedCount: number;
      readonly reason: string;
    };

/** Whole days since epoch for a YYYY-MM-DD string (UTC, DST-proof). */
function dayIndex(iso: string): number {
  const epochMs = Date.parse(iso);
  return Number.isNaN(epochMs) ? Number.NaN : Math.floor(epochMs / 86_400_000);
}

function nearestWeight(
  weights: readonly WeightRead[],
  lapDate: string,
): WeightRead | null {
  const lapDay = dayIndex(lapDate);
  if (Number.isNaN(lapDay)) {
    return null;
  }
  let best: WeightRead | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const weight of weights) {
    const day = dayIndex(weight.recorded_on);
    if (Number.isNaN(day)) {
      continue;
    }
    const diff = Math.abs(day - lapDay);
    if (diff < bestDiff) {
      best = weight;
      bestDiff = diff;
    }
  }
  return best;
}

export function buildTrackCorrelations(
  sessionBests: readonly SessionBest[],
  weights: readonly WeightRead[],
): readonly TrackCorrelation[] {
  const sessionsByTrack = new Map<
    string,
    { readonly day: number; readonly best: SessionBest }[]
  >();
  for (const session of sessionBests) {
    const day = dayIndex(session.lap_date);
    if (Number.isNaN(day)) {
      continue;
    }
    const list = sessionsByTrack.get(session.track_name);
    if (list === undefined) {
      sessionsByTrack.set(session.track_name, [{ day, best: session }]);
    } else {
      list.push({ day, best: session });
    }
  }

  const results: TrackCorrelation[] = [];
  for (const [trackName, sessions] of sessionsByTrack) {
    sessions.sort((a, b) => a.day - b.day);
    const points: CorrelationPoint[] = [];
    for (const session of sessions) {
      const weight = nearestWeight(weights, session.best.lap_date);
      if (weight === null) {
        continue;
      }
      points.push({
        lapDate: session.best.lap_date,
        weightKg: weight.weight_kg,
        bestTimeMs: session.best.best_time_ms,
      });
    }
    const raceDayCount = sessions.length;
    if (weights.length === 0) {
      results.push({
        kind: "insufficient",
        trackName,
        raceDayCount,
        pairedCount: 0,
        reason:
          "no weigh-ins yet — log weight near race days to unlock the correlation",
      });
    } else if (raceDayCount < 2) {
      results.push({
        kind: "insufficient",
        trackName,
        raceDayCount,
        pairedCount: points.length,
        reason: "only one race day — log laps from at least two race days",
      });
    } else if (points.length < 2) {
      results.push({
        kind: "insufficient",
        trackName,
        raceDayCount,
        pairedCount: points.length,
        reason: `only ${points.length} of ${raceDayCount} race days pair with a weigh-in`,
      });
    } else {
      results.push({
        kind: "ok",
        trackName,
        raceDayCount,
        points,
        r: pearsonR(
          points.map((point) => ({
            x: point.weightKg,
            y: point.bestTimeMs,
          })),
        ),
      });
    }
  }
  results.sort((a, b) => a.trackName.localeCompare(b.trackName));
  return results;
}
