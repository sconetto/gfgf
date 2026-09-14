import type { ReactElement } from "react";

import type { HabitLogRead } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";
import { CheckCircleGlyph, CircleGlyph } from "@/components/icons";
import { InsufficientData } from "@/components/InsufficientData";

interface HabitHistoryProps {
  /** Recent daily logs (any order; the page loads a 30-day window). */
  readonly logs: readonly HabitLogRead[];
}

export function HabitHistory({ logs }: HabitHistoryProps): ReactElement {
  const newestFirst = [...logs].sort((a, b) =>
    b.log_date.localeCompare(a.log_date),
  );
  return (
    <section aria-label="Habit history" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-xl font-bold text-label">Habits</h2>
        <p className="text-[13px] text-label-tertiary">newest first</p>
      </div>
      <div className="rounded-[12px] border border-separator bg-card p-5">
        {newestFirst.length === 0 ? (
          <InsufficientData
            message="No check-ins yet"
            hint="Use the daily check-in above to log your first day."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-separator">
            {newestFirst.map((log) => (
              <HabitRow key={log.id} log={log} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function HabitRow({ log }: { readonly log: HabitLogRead }): ReactElement {
  const enabledFlags = Object.entries(log.flags)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-16 shrink-0 text-[15px] tabular-nums text-label">
        {formatShortDate(Date.parse(log.log_date))}
      </span>
      <span
        className={`shrink-0 ${log.exercised ? "text-ios-green" : "text-label-tertiary"}`}
        title={log.exercised ? "exercised" : "no exercise"}
      >
        {log.exercised ? (
          <CheckCircleGlyph className="h-5 w-5" />
        ) : (
          <CircleGlyph className="h-5 w-5" />
        )}
        <span className="sr-only">
          {log.exercised ? "exercised" : "no exercise"}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {enabledFlags.map((name) => (
          <span
            key={name}
            className="rounded-full bg-ios-green/15 px-2.5 py-0.5 text-xs font-medium text-ios-green"
          >
            {name}
          </span>
        ))}
        {log.note === null || log.note === "" ? null : (
          <span className="min-w-0 truncate text-xs text-label-tertiary">
            {log.note}
          </span>
        )}
      </div>
    </li>
  );
}
