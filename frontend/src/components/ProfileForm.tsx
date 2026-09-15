"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactElement } from "react";

import {
  saveProfile,
  type ActivityLevel,
  type ProfileRead,
  type Sex,
} from "@/lib/api";
import { Field, StatusLine, SubmitButton, inputClass, type FormStatus } from "@/components/form";
import { Panel } from "@/components/Panel";

const ACTIVITY_OPTIONS: Readonly<Array<{ readonly value: ActivityLevel; readonly label: string }>> = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Lightly active" },
  { value: "moderate", label: "Moderately active" },
  { value: "very_active", label: "Very active" },
];

interface ProfileFormProps {
  readonly profile: ProfileRead | null;
  readonly onSaved: () => void;
}

export function ProfileForm({ profile, onSaved }: ProfileFormProps): ReactElement {
  const [ageYears, setAgeYears] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [heightCm, setHeightCm] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">("");
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  useEffect(() => {
    setAgeYears(profile === null ? "" : String(profile.age_years));
    setSex(profile?.sex ?? "");
    setHeightCm(profile === null ? "" : String(profile.height_cm));
    setActivityLevel(profile?.activity_level ?? "");
  }, [profile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (status.kind === "submitting") {
      return;
    }
    const age = Number(ageYears.trim());
    if (ageYears.trim() === "" || !Number.isInteger(age) || age < 1 || age > 120) {
      setStatus({ kind: "error", message: "age must be a whole number between 1 and 120" });
      return;
    }
    const height = Number(heightCm.trim());
    if (heightCm.trim() === "" || !Number.isFinite(height) || height <= 0) {
      setStatus({ kind: "error", message: "height must be a number greater than 0" });
      return;
    }
    if (sex === "") {
      setStatus({ kind: "error", message: "pick a sex" });
      return;
    }
    if (activityLevel === "") {
      setStatus({ kind: "error", message: "pick an activity level" });
      return;
    }
    setStatus({ kind: "submitting" });
    try {
      await saveProfile({ age_years: age, sex, height_cm: height, activity_level: activityLevel });
      setStatus({ kind: "saved", message: "Profile saved — healthy ranges are now personalized." });
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
      title="Profile"
      meta={<span className="text-xs text-label-tertiary">personalizes healthy ranges</span>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="age" htmlFor="profile-age">
            <input
              id="profile-age"
              type="number"
              inputMode="numeric"
              placeholder="34"
              value={ageYears}
              onChange={(event) => {
                setAgeYears(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="height (cm)" htmlFor="profile-height">
            <input
              id="profile-height"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="178"
              value={heightCm}
              onChange={(event) => {
                setHeightCm(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="sex" htmlFor="profile-sex">
          <select
            id="profile-sex"
            value={sex}
            onChange={(event) => {
              setSex(event.target.value as Sex);
            }}
            className={inputClass}
          >
            <option value="" disabled>
              select…
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>
        <Field label="activity level" htmlFor="profile-activity">
          <select
            id="profile-activity"
            value={activityLevel}
            onChange={(event) => {
              setActivityLevel(event.target.value as ActivityLevel);
            }}
            className={inputClass}
          >
            <option value="" disabled>
              select…
            </option>
            {ACTIVITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton disabled={status.kind === "submitting"}>
            {profile === null ? "save profile" : "update profile"}
          </SubmitButton>
          <StatusLine status={status} />
        </div>
      </form>
    </Panel>
  );
}
