"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { createWeight } from "@/lib/api";
import { isIsoDate, todayLocalISO } from "@/lib/dates";
import { Field, StatusLine, SubmitButton, inputClass, type FormStatus } from "@/components/form";
import { Panel } from "@/components/Panel";

interface WeighInFormProps {
  readonly onSaved: () => void;
}

export function WeighInForm({ onSaved }: WeighInFormProps): ReactElement {
  const [recordedOn, setRecordedOn] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  useEffect(() => {
    setRecordedOn(todayLocalISO());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status.kind === "submitting") {
      return;
    }
    if (!isIsoDate(recordedOn)) {
      setStatus({ kind: "error", message: "pick a valid date" });
      return;
    }
    const weight = Number(weightKg.trim());
    if (weightKg.trim() === "" || !Number.isFinite(weight) || weight <= 0) {
      setStatus({ kind: "error", message: "weight must be a number greater than 0" });
      return;
    }
    let bodyFat: number | undefined = undefined;
    if (bodyFatPct.trim() !== "") {
      const parsed = Number(bodyFatPct.trim());
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        setStatus({ kind: "error", message: "body fat must be between 0 and 100" });
        return;
      }
      bodyFat = parsed;
    }
    setStatus({ kind: "submitting" });
    try {
      await createWeight({
        recorded_on: recordedOn,
        weight_kg: weight,
        body_fat_pct: bodyFat,
        note: note.trim() === "" ? undefined : note.trim(),
      });
      setStatus({
        kind: "saved",
        message: `Saved ${weight.toFixed(1)} kg for ${recordedOn} — same date updates the entry.`,
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
      title="Weigh-in"
      meta={<span className="text-xs text-label-tertiary">one per day · upsert</span>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="date" htmlFor="weigh-in-date">
            <input
              id="weigh-in-date"
              type="date"
              value={recordedOn}
              onChange={(event) => {
                setRecordedOn(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="weight (kg)" htmlFor="weigh-in-weight">
            <input
              id="weigh-in-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="82.5"
              value={weightKg}
              onChange={(event) => {
                setWeightKg(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="body fat (%)" htmlFor="weigh-in-body-fat" hint="optional">
            <input
              id="weigh-in-body-fat"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              value={bodyFatPct}
              onChange={(event) => {
                setBodyFatPct(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="note" htmlFor="weigh-in-note" hint="optional">
            <input
              id="weigh-in-note"
              type="text"
              placeholder="morning, post-run…"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton disabled={status.kind === "submitting"}>log weigh-in</SubmitButton>
          <StatusLine status={status} />
        </div>
      </form>
    </Panel>
  );
}
