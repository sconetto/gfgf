import type { ReactElement } from "react";

import type { PersonalBest } from "@/lib/api";
import { formatLapTime } from "@/lib/laptime";
import { InsufficientData } from "@/components/InsufficientData";
import { Panel } from "@/components/Panel";

interface PersonalBestBoardProps {
  readonly personalBests: readonly PersonalBest[];
}

export function PersonalBestBoard({
  personalBests,
}: PersonalBestBoardProps): ReactElement {
  const sorted = [...personalBests].sort((a, b) => a.best_time_ms - b.best_time_ms);
  return (
    <Panel
      title="Personal Bests"
      meta={
        <span className="text-xs text-label-tertiary">lifetime · fastest first</span>
      }
    >
      {sorted.length === 0 ? (
        <InsufficientData
          message="No laps yet"
          hint="Your per-track bests land here."
        />
      ) : (
        <ol className="flex flex-col divide-y divide-separator">
          {sorted.map((best, index) => (
            <li
              key={best.track_name}
              className="flex items-baseline justify-between gap-3 py-2.5"
            >
              <span className="flex items-baseline gap-2 text-[15px] text-label">
                <span className="text-xs tabular-nums text-label-tertiary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {best.track_name}
              </span>
              <span className="text-[17px] font-semibold tabular-nums text-ios-green">
                {formatLapTime(best.best_time_ms)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
