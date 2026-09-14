import type { ReactElement } from "react";

import type { SessionBest, WeightRead } from "@/lib/api";
import { buildTrackCorrelations, type TrackCorrelation } from "@/lib/correlation";
import { CorrelationChart } from "@/components/CorrelationChart";
import { InsufficientData } from "@/components/InsufficientData";
import { Panel } from "@/components/Panel";

interface CorrelationPanelProps {
  readonly sessionBests: readonly SessionBest[];
  readonly weights: readonly WeightRead[];
}

export function CorrelationPanel({
  sessionBests,
  weights,
}: CorrelationPanelProps): ReactElement {
  const tracks = buildTrackCorrelations(sessionBests, weights);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="correlation-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="correlation-heading" className="text-xl font-bold text-label">
          Weight ↔ Lap Time
        </h2>
        <p className="text-[13px] text-label-tertiary">
          best lap per race day × nearest weigh-in by date
        </p>
      </div>
      {tracks.length === 0 ? (
        <div className="rounded-[12px] border border-separator bg-card p-5">
          <InsufficientData
            message="No laps yet"
            hint="Log laps from your regular track to unlock the correlation."
          />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tracks.map((track) => (
            <TrackCard key={track.trackName} track={track} />
          ))}
        </div>
      )}
    </section>
  );
}

function TrackCard({ track }: { readonly track: TrackCorrelation }): ReactElement {
  if (track.kind === "insufficient") {
    return (
      <Panel
        title={track.trackName}
        meta={<span className="text-xs text-label-tertiary">insufficient data</span>}
      >
        <InsufficientData message={track.reason} />
      </Panel>
    );
  }
  const r = track.r;
  const rText = r === null ? "r = —" : `r = ${r.toFixed(2)}`;
  const strength =
    r === null
      ? ""
      : Math.abs(r) >= 0.7
        ? "strong"
        : Math.abs(r) >= 0.4
          ? "moderate"
          : "weak";
  return (
    <Panel
      title={track.trackName}
      meta={
        <span className="text-xs tabular-nums text-label-tertiary">
          {rText}
          {strength === "" ? "" : ` · ${strength}`} · {track.raceDayCount} race days
        </span>
      }
    >
      <CorrelationChart trackName={track.trackName} points={track.points} />
    </Panel>
  );
}
