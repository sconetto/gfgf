"use client";

import { useState } from "react";
import type { ReactElement } from "react";

import { deleteWeight, type WeightRead } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { InsufficientData } from "@/components/InsufficientData";
import { TrashGlyph } from "@/components/icons";

interface WeightHistoryProps {
  /** Weigh-ins as the API returns them (date ascending). */
  readonly weights: readonly WeightRead[];
  /** Page refresh — keeps the trend, correlation, and favorites in sync. */
  readonly onDeleted: () => void;
}

interface WeightMonthGroup {
  readonly key: string;
  readonly label: string;
  readonly entries: WeightRead[];
}

/** Group weigh-ins (newest first) under "Month Year" headers. */
function groupByMonth(
  weights: readonly WeightRead[],
): readonly WeightMonthGroup[] {
  const groups: WeightMonthGroup[] = [];
  const byKey = new Map<string, WeightMonthGroup>();
  for (const weight of weights) {
    const key = weight.recorded_on.slice(0, 7);
    let group = byKey.get(key);
    if (group === undefined) {
      const label = new Date(
        Number(key.slice(0, 4)),
        Number(key.slice(5, 7)) - 1,
        1,
      ).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      group = { key, label, entries: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(weight);
  }
  return groups;
}

export function WeightHistory({
  weights,
  onDeleted,
}: WeightHistoryProps): ReactElement {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const newestFirst = [...weights].sort((a, b) =>
    b.recorded_on.localeCompare(a.recorded_on),
  );
  const groups = groupByMonth(newestFirst);

  async function handleDelete(weight: WeightRead): Promise<void> {
    if (deletingId !== null) {
      return;
    }
    setDeletingId(weight.id);
    setError(null);
    try {
      await deleteWeight(weight.id);
      onDeleted();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Unknown error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section aria-label="Weight history" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold text-label">Weight history</h2>
        <p className="text-[13px] text-label-tertiary">
          {weights.length === 0
            ? "no entries yet"
            : `${weights.length} ${weights.length === 1 ? "entry" : "entries"} · newest first`}
        </p>
      </div>
      <div className="rounded-[12px] border border-separator bg-card p-5">
        {weights.length === 0 ? (
          <InsufficientData
            message="No weigh-ins yet"
            hint="Log your first weigh-in above to build the history."
          />
        ) : (
          <div className="flex flex-col">
            {groups.map((group, groupIndex) => (
              <section
                key={group.key}
                className={groupIndex === 0 ? "" : "pt-3"}
              >
                <p className="px-1 pb-1 text-xs font-semibold text-label-secondary">
                  {group.label}
                </p>
                <ul className="flex flex-col divide-y divide-separator">
                  {group.entries.map((weight) => (
                    <WeightRow
                      key={weight.id}
                      weight={weight}
                      deleting={deletingId === weight.id}
                      onDelete={(target) => {
                        void handleDelete(target);
                      }}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {error === null ? null : (
              <p className="px-1 pt-3 text-xs font-medium text-ios-red">{error}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function WeightRow({
  weight,
  deleting,
  onDelete,
}: {
  readonly weight: WeightRead;
  readonly deleting: boolean;
  readonly onDelete: (weight: WeightRead) => void;
}): ReactElement {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-16 shrink-0 text-[15px] tabular-nums text-label">
        {formatShortDate(Date.parse(weight.recorded_on))}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[15px] font-semibold tabular-nums text-label">
            {weight.weight_kg.toFixed(1)} kg
          </span>
          {weight.body_fat_pct === null ? null : (
            <span className="text-[13px] tabular-nums text-label-secondary">
              {weight.body_fat_pct.toFixed(1)}% body fat
            </span>
          )}
        </p>
        {weight.note === null || weight.note === "" ? null : (
          <p className="truncate text-xs text-label-tertiary">{weight.note}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          onDelete(weight);
        }}
        disabled={deleting}
        aria-label={`Delete the weigh-in from ${weight.recorded_on}`}
        title={`Delete the weigh-in from ${weight.recorded_on}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-tertiary transition-colors hover:bg-ios-red/10 hover:text-ios-red focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <TrashGlyph className="h-4 w-4" />
      </button>
    </li>
  );
}
