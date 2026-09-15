import type { ReactElement } from "react";

import { LapHistory } from "@/components/LapHistory";
import { WeightHistory } from "@/components/WeightHistory";
import type { DashboardPanelProps } from "@/components/panels/types";

/** History: the weight and lap record tables. */
export function HistoryPanel({
  weightsState,
  refresh,
  reloadKey,
  tracks,
  personalBestsState,
  rememberedTracks,
}: DashboardPanelProps): ReactElement {
  return (
    <div className="flex flex-col gap-8">
      {weightsState.kind === "loaded" ? (
        <WeightHistory weights={weightsState.data} onDeleted={refresh} />
      ) : null}
      {personalBestsState.kind === "loaded" || rememberedTracks.length > 0 ? (
        <LapHistory tracks={tracks} reloadKey={reloadKey} />
      ) : null}
    </div>
  );
}
