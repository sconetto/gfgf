import type { ReactElement } from "react";

import type { HealthStatus } from "@/lib/api";

export type HealthState =
  | { readonly kind: "loading" }
  | { readonly kind: "healthy"; readonly health: HealthStatus }
  | { readonly kind: "unreachable"; readonly message: string };

/** Presentation style: one combined pill, or stacked per-service chips. */
export type HealthBadgeVariant = "combined" | "split";

interface HealthBadgeProps {
  readonly state: HealthState;
  /** Defaults to "combined" (mobile top bar); the sidebar footer uses "split". */
  readonly variant?: HealthBadgeVariant;
}

/**
 * Backend reachability indicator. "combined" renders one pill summarizing
 * backend + db (mobile top bar, where space is tight); "split" renders two
 * compact chips — "backend" over "database" — for the sidebar footer container.
 */
export function HealthBadge({
  state,
  variant = "combined",
}: HealthBadgeProps): ReactElement {
  if (variant === "split") {
    return <SplitHealthBadge state={state} />;
  }
  return <CombinedHealthBadge state={state} />;
}

/** Single pill summarizing backend + db — the mobile top-bar variant. */
function CombinedHealthBadge({
  state,
}: {
  readonly state: HealthState;
}): ReactElement {
  switch (state.kind) {
    case "loading":
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-separator bg-card px-3 py-1.5 text-xs font-medium text-label-tertiary">
          <span className="h-2 w-2 rounded-full bg-label-tertiary" aria-hidden="true" />
          checking backend…
        </span>
      );
    case "healthy":
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-separator bg-card px-3 py-1.5 text-xs font-medium text-label-secondary">
          <span className="h-2 w-2 rounded-full bg-ios-green" aria-hidden="true" />
          backend {state.health.status} · db {state.health.db}
        </span>
      );
    case "unreachable":
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-ios-red/30 bg-card px-3 py-1.5 text-xs font-medium text-ios-red">
          <span className="h-2 w-2 rounded-full bg-ios-red" aria-hidden="true" />
          backend unreachable ({state.message})
        </span>
      );
  }
}

/** Stacked "be" / "db" chips as an equal-width key-value list — sidebar footer. */
function SplitHealthBadge({
  state,
}: {
  readonly state: HealthState;
}): ReactElement {
  switch (state.kind) {
    case "loading":
      return (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Chip
            label="backend:"
            dotClassName="bg-label-tertiary"
            value="…"
            valueClassName="text-label-tertiary"
          />
          <Chip
            label="database:"
            dotClassName="bg-label-tertiary"
            value="…"
            valueClassName="text-label-tertiary"
          />
        </div>
      );
    case "healthy":
      return (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Chip
            label="backend:"
            dotClassName="bg-ios-green"
            value={state.health.status}
            valueClassName="text-label-secondary"
          />
          <Chip
            label="database:"
            dotClassName="bg-ios-green"
            value={state.health.db}
            valueClassName="text-label-secondary"
          />
        </div>
      );
    case "unreachable":
      return (
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Chip
            label="backend:"
            dotClassName="bg-ios-red"
            value="down"
            valueClassName="text-ios-red"
            title={`backend unreachable (${state.message})`}
          />
          <Chip
            label="database:"
            dotClassName="bg-label-tertiary"
            value="—"
            valueClassName="text-label-tertiary"
          />
        </div>
      );
  }
}

interface ChipProps {
  readonly label: string;
  readonly dotClassName: string;
  readonly value: string;
  readonly valueClassName: string;
  /** Optional hover hint (surfaces the unreachable error message). */
  readonly title?: string | undefined;
}

function Chip({
  label,
  dotClassName,
  value,
  valueClassName,
  title,
}: ChipProps): ReactElement {
  return (
    <span
      title={title}
      className="flex w-full items-center justify-between gap-1.5 rounded-full border border-separator bg-card px-2.5 py-1 text-[11px] font-medium leading-none"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClassName}`}
          aria-hidden="true"
        />
        <span className="text-label-tertiary">{label}</span>
      </span>
      <span className={valueClassName}>{value}</span>
    </span>
  );
}
