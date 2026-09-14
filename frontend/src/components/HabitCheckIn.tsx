"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactElement } from "react";

import { createHabitLog, type HabitLogRead } from "@/lib/api";
import { isIsoDate, todayLocalISO } from "@/lib/dates";
import { Field, StatusLine, SubmitButton, inputClass, type FormStatus } from "@/components/form";
import { Panel } from "@/components/Panel";

interface HabitCheckInProps {
  readonly logs: readonly HabitLogRead[];
  readonly onSaved: () => void;
}

export function HabitCheckIn({ logs, onSaved }: HabitCheckInProps): ReactElement {
  const [logDate, setLogDate] = useState("");
  const [exercised, setExercised] = useState(false);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [newFlagName, setNewFlagName] = useState("");
  const [addedFlags, setAddedFlags] = useState<readonly string[]>([]);
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  useEffect(() => {
    setLogDate(todayLocalISO());
  }, []);

  const existing = logs.find((log) => log.log_date === logDate) ?? null;

  useEffect(() => {
    setExercised(existing?.exercised ?? false);
    setNote(existing?.note ?? "");
    setFlags(existing === null ? {} : { ...existing.flags });
  }, [existing]);

  const knownFlags = useMemo(() => {
    const names = new Set<string>();
    for (const log of logs) {
      for (const name of Object.keys(log.flags)) {
        names.add(name);
      }
    }
    for (const name of addedFlags) {
      names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [logs, addedFlags]);

  function toggleFlag(name: string): void {
    setFlags((current) => ({ ...current, [name]: !(current[name] === true) }));
  }

  function addFlag(): void {
    const name = newFlagName.trim().toLowerCase();
    if (name === "") {
      return;
    }
    setFlags((current) => ({ ...current, [name]: true }));
    if (!knownFlags.includes(name)) {
      setAddedFlags((current) => [...current, name]);
    }
    setNewFlagName("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status.kind === "submitting") {
      return;
    }
    if (!isIsoDate(logDate)) {
      setStatus({ kind: "error", message: "pick a valid date" });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      await createHabitLog({
        log_date: logDate,
        exercised,
        flags,
        note: note.trim() === "" ? undefined : note.trim(),
      });
      setStatus({ kind: "saved", message: `Check-in saved for ${logDate}.` });
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
      title="Daily check-in"
      meta={<span className="text-xs text-label-tertiary">one per day · upsert</span>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <Field label="date" htmlFor="habit-date">
          <input
            id="habit-date"
            type="date"
            value={logDate}
            onChange={(event) => {
              setLogDate(event.target.value);
            }}
            className={inputClass}
          />
        </Field>
        <button
          type="button"
          role="switch"
          aria-checked={exercised}
          onClick={() => {
            setExercised((current) => !current);
          }}
          className="flex items-center gap-3 self-start rounded-md py-1"
        >
          <span
            className={`relative inline-flex h-[31px] w-[51px] items-center rounded-full transition-colors ${
              exercised ? "bg-ios-green" : "bg-fill"
            }`}
          >
            <span
              className={`absolute left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform ${
                exercised ? "translate-x-[20px]" : ""
              }`}
            />
          </span>
          <span
            className={`text-sm font-medium ${
              exercised ? "text-ios-green" : "text-label-secondary"
            }`}
          >
            exercised
          </span>
        </button>
        {knownFlags.length === 0 ? (
          <p className="text-xs text-label-tertiary">
            no habit flags yet — add one below (e.g. cardio, stretch)
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {knownFlags.map((name) => {
              const on = flags[name] === true;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    toggleFlag(name);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    on
                      ? "bg-ios-green/15 text-ios-green"
                      : "bg-fill text-label-secondary hover:text-label"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newFlagName}
            placeholder="new flag…"
            aria-label="new habit flag name"
            onChange={(event) => {
              setNewFlagName(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addFlag();
              }
            }}
            className={inputClass}
          />
          <button
            type="button"
            onClick={addFlag}
            className="whitespace-nowrap rounded-[10px] bg-fill px-3 py-2 text-sm font-medium text-label transition-colors hover:bg-separator"
          >
            add
          </button>
        </div>
        <Field label="note" htmlFor="habit-note" hint="optional">
          <input
            id="habit-note"
            type="text"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
            }}
            className={inputClass}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton accent="teal" disabled={status.kind === "submitting"}>
            save check-in
          </SubmitButton>
          <StatusLine status={status} />
        </div>
      </form>
    </Panel>
  );
}
