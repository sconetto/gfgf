"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";

import { fetchLaps, type LapRead } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { formatLapTime } from "@/lib/laptime";
import { InsufficientData } from "@/components/InsufficientData";

type LapsState =
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly laps: readonly LapRead[] }
  | { readonly kind: "error"; readonly message: string };

interface LapHistoryProps {
  /** Known track names (from the personal-bests board), any order. */
  readonly tracks: readonly string[];
  /** Bumped by the page on every data refresh so new laps appear. */
  readonly reloadKey: number;
}

export function LapHistory({
  tracks,
  reloadKey,
}: LapHistoryProps): ReactElement {
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [state, setState] = useState<LapsState>({ kind: "loading" });

  // Fall back to the first track until (or if) the user picks one; also
  // recovers when the selected track disappears after a refresh.
  const effectiveTrack: string | null =
    selectedTrack !== null && tracks.includes(selectedTrack)
      ? selectedTrack
      : tracks[0] ?? null;

  useEffect(() => {
    if (effectiveTrack === null) {
      setState({ kind: "loaded", laps: [] });
      return;
    }
    const controller = new AbortController();
    setState({ kind: "loading" });
    fetchLaps(effectiveTrack, controller.signal)
      .then((laps) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ kind: "loaded", laps });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      });
    return () => controller.abort();
  }, [effectiveTrack, reloadKey]);

  return (
    <section aria-label="Lap history" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold text-label">Laps</h2>
        <p className="text-[13px] text-label-tertiary">
          every lap · oldest first
        </p>
      </div>
      {tracks.length === 0 ? (
        <div className="rounded-[12px] border border-separator bg-card p-5">
          <InsufficientData
            message="No laps yet"
            hint="Log laps from your regular track to build the history."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-[12px] border border-separator bg-card p-5">
          <div
            role="radiogroup"
            aria-label="Lap history track"
            className="flex flex-wrap gap-2"
          >
            {tracks.map((track) => {
              const selected = track === effectiveTrack;
              return (
                <button
                  key={track}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setSelectedTrack(track);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    selected
                      ? "bg-ios-green text-white"
                      : "bg-fill text-label-secondary hover:text-label"
                  }`}
                >
                  {track}
                </button>
              );
            })}
          </div>
          {state.kind === "loading" ? (
            <p className="px-1 py-8 text-center text-sm text-label-tertiary">
              loading…
            </p>
          ) : state.kind === "error" ? (
            <p className="px-1 py-8 text-center text-sm text-ios-red">
              {state.message}
            </p>
          ) : state.laps.length === 0 ? (
            <InsufficientData
              message="No laps at this track yet"
              hint="Laps logged with this track name land here."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-separator">
              {[...state.laps]
                .sort(
                  (a, b) =>
                    a.lap_date.localeCompare(b.lap_date) || a.id - b.id,
                )
                .map((lap) => (
                  <LapRow key={lap.id} lap={lap} />
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function LapRow({ lap }: { readonly lap: LapRead }): ReactElement {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-16 shrink-0 text-[15px] tabular-nums text-label">
        {formatShortDate(Date.parse(lap.lap_date))}
      </span>
      <span className="text-[17px] font-semibold tabular-nums text-ios-green">
        {formatLapTime(lap.time_ms)}
      </span>
      {lap.kart_class === null || lap.kart_class === "" ? null : (
        <span className="shrink-0 rounded-full bg-fill px-2.5 py-0.5 text-xs font-medium text-label-secondary">
          {lap.kart_class}
        </span>
      )}
      {lap.note === null || lap.note === "" ? null : (
        <span className="min-w-0 flex-1 truncate text-xs text-label-tertiary">
          {lap.note}
        </span>
      )}
    </li>
  );
}
