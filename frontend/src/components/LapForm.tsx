"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { createLap } from "@/lib/api";
import { isIsoDate, todayLocalISO } from "@/lib/dates";
import { formatLapTime, parseLapTime } from "@/lib/laptime";
import { Field, StatusLine, SubmitButton, inputClass, type FormStatus } from "@/components/form";
import { Panel } from "@/components/Panel";

interface LapFormProps {
  readonly onSaved: () => void;
  readonly tracks: readonly string[];
}

export function LapForm({ onSaved, tracks }: LapFormProps): ReactElement {
  const [trackName, setTrackName] = useState("");
  const [lapTime, setLapTime] = useState("");
  const [lapDate, setLapDate] = useState("");
  const [kartClass, setKartClass] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  useEffect(() => {
    setLapDate(todayLocalISO());
  }, []);

  const preview = lapTime.trim() === "" ? null : parseLapTime(lapTime);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status.kind === "submitting") {
      return;
    }
    if (trackName.trim() === "") {
      setStatus({ kind: "error", message: "track name is required" });
      return;
    }
    if (!isIsoDate(lapDate)) {
      setStatus({ kind: "error", message: "pick a valid date" });
      return;
    }
    const parsed = parseLapTime(lapTime);
    if (!parsed.ok) {
      setStatus({ kind: "error", message: `lap time ${parsed.message}` });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      const lap = await createLap({
        track_name: trackName.trim(),
        lap_time: lapTime.trim(),
        lap_date: lapDate,
        kart_class: kartClass.trim() === "" ? undefined : kartClass.trim(),
        note: note.trim() === "" ? undefined : note.trim(),
      });
      setStatus({
        kind: "saved",
        message: `Lap saved — ${formatLapTime(lap.time_ms)} at ${lap.track_name}.`,
      });
      onSaved();
    } catch (error: unknown) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Panel
      title="Lap"
      meta={<span className="text-xs text-label-tertiary">every lap counts</span>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <Field label="track" htmlFor="lap-track">
          <input
            id="lap-track"
            type="text"
            list="gfgf-track-options"
            placeholder="Kartódromo X"
            value={trackName}
            onChange={(event) => {
              setTrackName(event.target.value);
            }}
            className={inputClass}
          />
          <datalist id="gfgf-track-options">
            {tracks.map((track) => (
              <option key={track} value={track} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="lap time" htmlFor="lap-time" hint="m:ss.ms or ss.ms">
            <input
              id="lap-time"
              type="text"
              placeholder="1:03.500"
              value={lapTime}
              onChange={(event) => {
                setLapTime(event.target.value);
              }}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
          <Field label="date" htmlFor="lap-date">
            <input
              id="lap-date"
              type="date"
              value={lapDate}
              onChange={(event) => {
                setLapDate(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
        </div>
        {preview !== null && preview.ok ? (
          <p className="text-xs font-medium tabular-nums text-ios-green">
            = {formatLapTime(preview.ms)} ({preview.ms} ms)
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="kart class" htmlFor="lap-kart-class" hint="optional">
            <input
              id="lap-kart-class"
              type="text"
              placeholder="Sprint SR4"
              value={kartClass}
              onChange={(event) => {
                setKartClass(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="note" htmlFor="lap-note" hint="optional">
            <input
              id="lap-note"
              type="text"
              placeholder="soft tyres, heat 2…"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton accent="green" disabled={status.kind === "submitting"}>
            log lap
          </SubmitButton>
          <StatusLine status={status} />
        </div>
      </form>
    </Panel>
  );
}
